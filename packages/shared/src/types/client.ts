import { YouTubeTrack } from "./yt";

export interface JoinMessage {
  type: 'JOIN';
  roomId: string;
  userId: string;
  userName: string;
}

export interface LeaveMessage {
  type: 'LEAVE';
  roomId: string;
}

export interface PlayMessage {
  type: 'PLAY';
  roomId: string;
}

export interface PauseMessage {
  type: 'PAUSE';
  roomId: string;
  positionMs: number;
}

export interface SeekMessage {
  type: 'SEEK';
  roomId: string;
  positionMs: number;
}

export interface ChangeTrackMessage {
  type: 'CHANGE_TRACK';
  roomId: string;
  trackId: string;
}

export interface SearchMessage {
  type: 'SEARCH';
  query: string;
  limit?: number;
}

export interface AddToQueueMessage {
  type: 'ADD_TO_QUEUE';
  roomId: string;
  track: YouTubeTrack;
}

export interface RemoveFromQueueMessage {
  type: 'REMOVE_FROM_QUEUE';
  roomId: string;
  index: number;
}

export interface HeartbeatMessage {
  type: 'HEARTBEAT';
  roomId: string;
  localPositionMs: number;
}

export type ClientMessage =
  | JoinMessage
  | LeaveMessage
  | PlayMessage
  | PauseMessage
  | SeekMessage
  | ChangeTrackMessage
  | SearchMessage
  | AddToQueueMessage
  | RemoveFromQueueMessage
  | HeartbeatMessage;