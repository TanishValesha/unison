import { env } from '../config/env';
import { YouTubeTrack } from '@unison/shared';
import { LRUCache } from './cache';
import { YouTubeSearchResponse, YouTubeVideosResponse } from './types';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

const searchCache = new LRUCache<YouTubeTrack[]>(200, 5 * 60 * 1000);
const videoCache = new LRUCache<YouTubeTrack>(200, 10 * 60 * 1000);

/**
 * Parse ISO 8601 duration string (e.g. "PT4M13S") to milliseconds.
 */
function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const seconds = parseInt(match[3] ?? '0', 10);

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/**
 * Search YouTube for music videos.
 * Uses the YouTube Data API v3 search.list endpoint with type=video and videoCategoryId=10 (Music).
 */
export async function searchYouTube(query: string, limit = 10): Promise<YouTubeTrack[]> {
  const cacheKey = `search:${query}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const url = new URL(`${BASE_URL}/search`);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('videoCategoryId', '10'); // Music category
  url.searchParams.set('maxResults', String(Math.min(limit, 50)));
  url.searchParams.set('key', env.YOUTUBE_API_KEY);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YouTube API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as YouTubeSearchResponse;

  const tracks: YouTubeTrack[] = data.items
    .filter((item) => item.id.videoId)
    .map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
      durationMs: 0, // Search endpoint doesn't include duration; filled by getVideoDetails
    }));

  searchCache.set(cacheKey, tracks);
  return tracks;
}

/**
 * Get detailed information for a single YouTube video, including duration.
 */
export async function getVideoDetails(videoId: string): Promise<YouTubeTrack> {
  const cached = videoCache.get(videoId);
  if (cached) return cached;

  const url = new URL(`${BASE_URL}/videos`);
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('id', videoId);
  url.searchParams.set('key', env.YOUTUBE_API_KEY);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YouTube API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as YouTubeVideosResponse;

  if (!data.items || data.items.length === 0) {
    throw new Error(`Video not found: ${videoId}`);
  }

  const item = data.items[0]!;
  const track: YouTubeTrack = {
    videoId: item.id,
    title: item.snippet.title,
    channelName: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
    durationMs: parseDuration(item.contentDetails.duration),
  };

  videoCache.set(videoId, track);
  return track;
}

/**
 * Get details for multiple videos at once (batch request).
 */
export async function getVideoDetailsBatch(videoIds: string[]): Promise<YouTubeTrack[]> {
  if (videoIds.length === 0) return [];

  const url = new URL(`${BASE_URL}/videos`);
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('id', videoIds.join(','));
  url.searchParams.set('key', env.YOUTUBE_API_KEY);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YouTube API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as YouTubeVideosResponse;

  return (data.items ?? []).map((item) => {
    const track: YouTubeTrack = {
      videoId: item.id,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
      durationMs: parseDuration(item.contentDetails.duration),
    };
    videoCache.set(item.id, track);
    return track;
  });
}