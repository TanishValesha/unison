import { RoomState } from '@unison/shared';

/**
 * Create a fresh room state with default values.
 */
export function createRoomState(roomId: string): RoomState {
  return {
    roomId,
    trackId: null,
    positionMs: 0,
    serverTimestamp: Date.now(),
    playing: false,
    playbackRate: 1.0,
    leaderId: null,
    queue: [],
    version: 0,
  };
}