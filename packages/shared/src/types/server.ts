import { RoomUser } from "./presence";
import { RoomState } from "./roomState";
import { YouTubeTrack } from "./yt";

export interface SyncMessage {
  type: 'SYNC';
  trackId: string | null;
  positionMs: number;
  serverTimestamp: number;
  playing: boolean;
  playbackRate: number;
  version: number;
}

export interface RoomStateMessage {
  type: 'ROOM_STATE';
  room: RoomState;
  users: RoomUser[];
}

export interface QueueUpdateMessage {
  type: 'QUEUE_UPDATE';
  queue: YouTubeTrack[];
}

export interface SearchResultsMessage {
  type: 'SEARCH_RESULTS';
  tracks: YouTubeTrack[];
}

export interface ErrorMessage {
  type: 'ERROR';
  code: string;
  message: string;
}

export interface UserJoinedMessage {
  type: 'USER_JOINED';
  userId: string;
  userName: string;
  users: RoomUser[];
}

export interface UserLeftMessage {
  type: 'USER_LEFT';
  userId: string;
  userName: string;
  users: RoomUser[];
}

export type ServerMessage =
  | SyncMessage
  | RoomStateMessage
  | QueueUpdateMessage
  | SearchResultsMessage
  | ErrorMessage
  | UserJoinedMessage
  | UserLeftMessage;