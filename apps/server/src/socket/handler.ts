import { Socket, Server as SocketIOServer } from 'socket.io';
import { ClientMessage, RoomUser } from '@unison/shared';
import { searchYouTube } from '../youtube';
import {
  createRoom,
  getRoom,
  deleteRoom,
  updatePlayback,
  addToQueue,
  removeFromQueue,
  setLeader,
  addUser,
  removeUser,
  getUsers,
} from '../room';
import { startSyncLoop, stopSyncLoop, broadcastSyncNow } from '../room';

/**
 * Register all message handlers for a connected socket.
 */
export function registerHandlers(socket: Socket, io: SocketIOServer): void {
  let currentRoomId: string | null = null;
  let currentUser: RoomUser | null = null;

  socket.on('message', (msg: ClientMessage) => {
    switch (msg.type) {
      // ============================================================
      // JOIN
      // ============================================================
      case 'JOIN': {
        currentRoomId = msg.roomId;
        currentUser = {
          userId: msg.userId,
          userName: msg.userName,
          joinedAt: Date.now(),
        };

        socket.join(`room:${msg.roomId}`);

        const room = createRoom(msg.roomId);
        const users = addUser(msg.roomId, currentUser);

        // First user becomes leader
        if (!room.leaderId) {
          setLeader(msg.roomId, msg.userId);
        }

        socket.emit('message', {
          type: 'ROOM_STATE',
          room: getRoom(msg.roomId),
          users,
        });

        socket.to(`room:${msg.roomId}`).emit('message', {
          type: 'USER_JOINED',
          userId: msg.userId,
          userName: msg.userName,
          users,
        });

        console.log(`[WS] ${msg.userName} joined room ${msg.roomId}`);
        break;
      }

      // ============================================================
      // LEAVE
      // ============================================================
      case 'LEAVE': {
        if (!currentRoomId || !currentUser) break;

        socket.leave(`room:${currentRoomId}`);
        const users = removeUser(currentRoomId, currentUser.userId);

        socket.to(`room:${currentRoomId}`).emit('message', {
          type: 'USER_LEFT',
          userId: currentUser.userId,
          userName: currentUser.userName,
          users,
        });

        // Clean up empty rooms
        if (users.length === 0) {
          stopSyncLoop(currentRoomId);
          deleteRoom(currentRoomId);
        }

        console.log(`[WS] ${currentUser.userName} left room ${currentRoomId}`);
        currentRoomId = null;
        currentUser = null;
        break;
      }

      // ============================================================
      // PLAY
      // ============================================================
      case 'PLAY': {
        if (!currentRoomId) break;
        updatePlayback(currentRoomId, { playing: true });
        startSyncLoop(currentRoomId, io);
        broadcastSyncNow(currentRoomId, io);
        break;
      }

      // ============================================================
      // PAUSE
      // ============================================================
      case 'PAUSE': {
        if (!currentRoomId) break;
        updatePlayback(currentRoomId, {
          playing: false,
          positionMs: msg.positionMs,
        });
        broadcastSyncNow(currentRoomId, io);
        break;
      }

      // ============================================================
      // SEEK
      // ============================================================
      case 'SEEK': {
        if (!currentRoomId) break;
        updatePlayback(currentRoomId, { positionMs: msg.positionMs });
        broadcastSyncNow(currentRoomId, io);
        break;
      }

      // ============================================================
      // CHANGE_TRACK
      // ============================================================
      case 'CHANGE_TRACK': {
        if (!currentRoomId) break;
        updatePlayback(currentRoomId, {
          trackId: msg.trackId,
          positionMs: 0,
          playing: true,
        });
        startSyncLoop(currentRoomId, io);
        broadcastSyncNow(currentRoomId, io);
        break;
      }

      // ============================================================
      // SEARCH
      // ============================================================
      case 'SEARCH': {
        searchYouTube(msg.query, msg.limit ?? 10)
          .then((tracks) => {
            socket.emit('message', {
              type: 'SEARCH_RESULTS',
              tracks,
            });
          })
          .catch((err) => {
            console.error('[WS] Search error:', err);
            socket.emit('message', {
              type: 'ERROR',
              code: 'SEARCH_FAILED',
              message: 'Failed to search YouTube',
            });
          });
        break;
      }

      // ============================================================
      // ADD_TO_QUEUE
      // ============================================================
      case 'ADD_TO_QUEUE': {
        if (!currentRoomId) break;
        addToQueue(currentRoomId, msg.track);
        const room = getRoom(currentRoomId);
        io.to(`room:${currentRoomId}`).emit('message', {
          type: 'QUEUE_UPDATE',
          queue: room?.queue ?? [],
        });
        break;
      }

      // ============================================================
      // REMOVE_FROM_QUEUE
      // ============================================================
      case 'REMOVE_FROM_QUEUE': {
        if (!currentRoomId) break;
        removeFromQueue(currentRoomId, msg.index);
        const room = getRoom(currentRoomId);
        io.to(`room:${currentRoomId}`).emit('message', {
          type: 'QUEUE_UPDATE',
          queue: room?.queue ?? [],
        });
        break;
      }

      // ============================================================
      // HEARTBEAT
      // ============================================================
      case 'HEARTBEAT': {
        // Phase 4 will use this for drift detection
        break;
      }

      default:
        console.warn(`[WS] Unknown message type from ${socket.id}`);
    }
  });

  // Handle disconnect (same as LEAVE)
  socket.on('disconnect', () => {
    if (currentRoomId && currentUser) {
      socket.to(`room:${currentRoomId}`).emit('message', {
        type: 'USER_LEFT',
        userId: currentUser.userId,
        userName: currentUser.userName,
        users: removeUser(currentRoomId, currentUser.userId),
      });

      const users = getUsers(currentRoomId);
      if (users.length === 0) {
        stopSyncLoop(currentRoomId);
        deleteRoom(currentRoomId);
      }
    }
  });
}