import { RoomState, YouTubeTrack, RoomUser } from '@unison/shared';
import { createRoomState } from './room-state';

/**
 * In-memory room storage.
 * Phase 2 will replace this with Redis.
 */
const rooms = new Map<string, RoomState>();
const roomUsers = new Map<string, RoomUser[]>();

export function createRoom(roomId: string): RoomState {
  if (rooms.has(roomId)) {
    return rooms.get(roomId)!;
  }
  const state = createRoomState(roomId);
  rooms.set(roomId, state);
  roomUsers.set(roomId, []);
  return state;
}

export function getRoom(roomId: string): RoomState | undefined {
  return rooms.get(roomId);
}

export function roomExists(roomId: string): boolean {
  return rooms.has(roomId);
}

export function deleteRoom(roomId: string): void {
  rooms.delete(roomId);
  roomUsers.delete(roomId);
}

export function updatePlayback(
  roomId: string,
  updates: Partial<Pick<RoomState, 'trackId' | 'positionMs' | 'playing' | 'playbackRate'>>
): RoomState | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  if (updates.trackId !== undefined) room.trackId = updates.trackId;
  if (updates.positionMs !== undefined) room.positionMs = updates.positionMs;
  if (updates.playing !== undefined) room.playing = updates.playing;
  if (updates.playbackRate !== undefined) room.playbackRate = updates.playbackRate;

  room.serverTimestamp = Date.now();
  room.version++;
  return room;
}

export function addToQueue(roomId: string, track: YouTubeTrack): RoomState | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  room.queue.push(track);
  room.version++;
  return room;
}

export function removeFromQueue(roomId: string, index: number): RoomState | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  if (index >= 0 && index < room.queue.length) {
    room.queue.splice(index, 1);
    room.version++;
  }
  return room;
}

export function setLeader(roomId: string, userId: string): RoomState | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  room.leaderId = userId;
  room.version++;
  return room;
}

export function addUser(roomId: string, user: RoomUser): RoomUser[] {
  const users = roomUsers.get(roomId) ?? [];
  const existing = users.findIndex((u) => u.userId === user.userId);
  if (existing >= 0) {
    users[existing] = user;
  } else {
    users.push(user);
  }
  roomUsers.set(roomId, users);
  return users;
}

export function removeUser(roomId: string, userId: string): RoomUser[] {
  const users = roomUsers.get(roomId) ?? [];
  const filtered = users.filter((u) => u.userId !== userId);
  roomUsers.set(roomId, filtered);
  return filtered;
}

export function getUsers(roomId: string): RoomUser[] {
  return roomUsers.get(roomId) ?? [];
}

export function getRoomCount(): number {
  return rooms.size;
}