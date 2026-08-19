import { Server as SocketIOServer } from 'socket.io';
import { SyncMessage } from '@unison/shared';
import { getRoom } from './room-manager';
import { env } from '../config/env';

/**
 * Track active sync intervals per room.
 */
const syncIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Compute the current position including elapsed time since last state change.
 */
function getCurrentPosition(room: NonNullable<ReturnType<typeof getRoom>>): number {
  if (!room.playing) return room.positionMs;
  const elapsed = (Date.now() - room.serverTimestamp) * room.playbackRate;
  return room.positionMs + elapsed;
}

/**
 * Build a SYNC message with the computed current position.
 */
function buildSyncMessage(room: NonNullable<ReturnType<typeof getRoom>>): SyncMessage {
  return {
    type: 'SYNC',
    trackId: room.trackId,
    positionMs: getCurrentPosition(room),
    serverTimestamp: Date.now(),
    playing: room.playing,
    playbackRate: room.playbackRate,
    version: room.version,
  };
}

/**
 * Start broadcasting SYNC messages to a room every SYNC_INTERVAL_MS.
 * Only broadcasts when the room is playing.
 */
export function startSyncLoop(roomId: string, io: SocketIOServer): void {
  if (syncIntervals.has(roomId)) return;

  const interval = setInterval(() => {
    const room = getRoom(roomId);
    if (!room) {
      stopSyncLoop(roomId);
      return;
    }

    if (!room.playing) return;

    io.to(`room:${roomId}`).emit('SYNC', buildSyncMessage(room));
  }, env.SYNC_INTERVAL_MS);

  syncIntervals.set(roomId, interval);
}

/**
 * Stop the sync loop for a room.
 */
export function stopSyncLoop(roomId: string): void {
  const interval = syncIntervals.get(roomId);
  if (interval) {
    clearInterval(interval);
    syncIntervals.delete(roomId);
  }
}

/**
 * Broadcast a SYNC message immediately (on state change like play/pause/seek).
 */
export function broadcastSyncNow(roomId: string, io: SocketIOServer): void {
  const room = getRoom(roomId);
  if (!room) return;

  io.to(`room:${roomId}`).emit('SYNC', buildSyncMessage(room));
}
