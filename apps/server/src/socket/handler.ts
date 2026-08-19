import { Socket, Server as SocketIOServer } from 'socket.io';
import {
  JoinMessage,
  LeaveMessage,
  PlayMessage,
  PauseMessage,
  SeekMessage,
  ChangeTrackMessage,
  SearchMessage,
  AddToQueueMessage,
  RemoveFromQueueMessage,
  HeartbeatMessage,
  RoomUser,
} from '@unison/shared';
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
 * Each event name matches the message type (JOIN, PLAY, PAUSE, etc.)
 */
export function registerHandlers(socket: Socket, io: SocketIOServer): void {
  let currentRoomId: string | null = null;
  let currentUser: RoomUser | null = null;

  // ============================================================
  // JOIN
  // ============================================================
  socket.on('JOIN', (msg: JoinMessage) => {
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

    socket.emit('ROOM_STATE', {
      type: 'ROOM_STATE',
      room: getRoom(msg.roomId),
      users,
    });

    socket.to(`room:${msg.roomId}`).emit('USER_JOINED', {
      type: 'USER_JOINED',
      userId: msg.userId,
      userName: msg.userName,
      users,
    });

    console.log(`[WS] ${msg.userName} joined room ${msg.roomId}`);
  });

  // ============================================================
  // LEAVE
  // ============================================================
  socket.on('LEAVE', (msg: LeaveMessage) => {
    if (!currentRoomId || !currentUser) return;

    socket.leave(`room:${currentRoomId}`);
    const users = removeUser(currentRoomId, currentUser.userId);

    socket.to(`room:${currentRoomId}`).emit('USER_LEFT', {
      type: 'USER_LEFT',
      userId: currentUser.userId,
      userName: currentUser.userName,
      users,
    });

    if (users.length === 0) {
      stopSyncLoop(currentRoomId);
      deleteRoom(currentRoomId);
    }

    console.log(`[WS] ${currentUser.userName} left room ${currentRoomId}`);
    currentRoomId = null;
    currentUser = null;
  });

  // ============================================================
  // PLAY
  // ============================================================
  socket.on('PLAY', (msg: PlayMessage) => {
    if (!currentRoomId) return;
    updatePlayback(currentRoomId, { playing: true });
    startSyncLoop(currentRoomId, io);
    broadcastSyncNow(currentRoomId, io);
  });

  // ============================================================
  // PAUSE
  // ============================================================
  socket.on('PAUSE', (msg: PauseMessage) => {
    if (!currentRoomId) return;
    updatePlayback(currentRoomId, {
      playing: false,
      positionMs: msg.positionMs,
    });
    broadcastSyncNow(currentRoomId, io);
  });

  // ============================================================
  // SEEK
  // ============================================================
  socket.on('SEEK', (msg: SeekMessage) => {
    if (!currentRoomId) return;
    updatePlayback(currentRoomId, { positionMs: msg.positionMs });
    broadcastSyncNow(currentRoomId, io);
  });

  // ============================================================
  // CHANGE_TRACK
  // ============================================================
  socket.on('CHANGE_TRACK', (msg: ChangeTrackMessage) => {
    if (!currentRoomId) return;
    updatePlayback(currentRoomId, {
      trackId: msg.trackId,
      positionMs: 0,
      playing: true,
    });
    startSyncLoop(currentRoomId, io);
    broadcastSyncNow(currentRoomId, io);
  });

  // ============================================================
  // SEARCH
  // ============================================================
  socket.on('SEARCH', (msg: SearchMessage) => {
    searchYouTube(msg.query, msg.limit ?? 10)
      .then((tracks) => {
        socket.emit('SEARCH_RESULTS', {
          type: 'SEARCH_RESULTS',
          tracks,
        });
      })
      .catch((err) => {
        console.error('[WS] Search error:', err);
        socket.emit('ERROR', {
          type: 'ERROR',
          code: 'SEARCH_FAILED',
          message: 'Failed to search YouTube',
        });
      });
  });

  // ============================================================
  // ADD_TO_QUEUE
  // ============================================================
  socket.on('ADD_TO_QUEUE', (msg: AddToQueueMessage) => {
    if (!currentRoomId) return;
    addToQueue(currentRoomId, msg.track);
    const room = getRoom(currentRoomId);
    io.to(`room:${currentRoomId}`).emit('QUEUE_UPDATE', {
      type: 'QUEUE_UPDATE',
      queue: room?.queue ?? [],
    });
  });

  // ============================================================
  // REMOVE_FROM_QUEUE
  // ============================================================
  socket.on('REMOVE_FROM_QUEUE', (msg: RemoveFromQueueMessage) => {
    if (!currentRoomId) return;
    removeFromQueue(currentRoomId, msg.index);
    const room = getRoom(currentRoomId);
    io.to(`room:${currentRoomId}`).emit('QUEUE_UPDATE', {
      type: 'QUEUE_UPDATE',
      queue: room?.queue ?? [],
    });
  });

  // ============================================================
  // HEARTBEAT
  // ============================================================
  socket.on('HEARTBEAT', (_msg: HeartbeatMessage) => {
    // Phase 4 will use this for drift detection
  });

  // ============================================================
  // DISCONNECT
  // ============================================================
  socket.on('disconnect', () => {
    if (currentRoomId && currentUser) {
      const users = removeUser(currentRoomId, currentUser.userId);

      socket.to(`room:${currentRoomId}`).emit('USER_LEFT', {
        type: 'USER_LEFT',
        userId: currentUser.userId,
        userName: currentUser.userName,
        users,
      });

      if (users.length === 0) {
        stopSyncLoop(currentRoomId);
        deleteRoom(currentRoomId);
      }

      console.log(`[WS] ${currentUser.userName} disconnected from room ${currentRoomId}`);
    }
  });
}