import { YouTubeTrack } from "./yt";

export interface RoomState {
  roomId: string;
  trackId: string | null;
  positionMs: number;
  serverTimestamp: number;
  playing: boolean;
  playbackRate: number;
  leaderId: string | null;
  queue: YouTubeTrack[];
  version: number;
}