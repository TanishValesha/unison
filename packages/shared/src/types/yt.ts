export interface YouTubeTrack {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  durationMs: number;
}

export interface YouTubeSearchResult {
  tracks: YouTubeTrack[];
  nextPageToken?: string;
}