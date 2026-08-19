'use client';

import { useState, useRef, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { computeTargetPosition, getPositionError } from '@/lib/sync-math';

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          height: string;
          width: string;
          videoId: string;
          playerVars: Record<string, number>;
          events: {
            onReady: () => void;
            onStateChange: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  setPlaybackRate: (rate: number) => void;
  getPlayerState: () => number;
  loadVideoById: (videoId: string) => void;
}

// Hardcoded track for quick testing
const TEST_TRACK = {
  videoId: 'JGwWNGJdvx8',
  title: 'Ed Sheeran - Shape of You',
  channelName: 'Ed Sheeran',
  thumbnailUrl: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
};

function generateUserName() {
  return 'User-' + Math.random().toString(36).slice(2, 6);
}

export default function Home() {
  const { isConnected, roomState, users, lastSync, joinRoom, play, pause, changeTrack } =
    useSocket();

  const [roomId, setRoomId] = useState('test-room');
  const [userName, setUserName] = useState(generateUserName);
  const [joined, setJoined] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [driftMs, setDriftMs] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);

  const playerRef = useRef<YTPlayer | null>(null);

  // Create YouTube player
  const createPlayer = () => {
    if (playerRef.current) return;

    playerRef.current = new window.YT.Player('yt-player', {
      height: '1',
      width: '1',
      videoId: TEST_TRACK.videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
      },
      events: {
        onReady: () => {
          console.log('[YT] Player ready');
          setPlayerReady(true);
        },
        onStateChange: (event: { data: number }) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
        },
      },
    });
  };

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT?.Player) {
      createPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      createPlayer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply SYNC corrections
  useEffect(() => {
    if (!lastSync || !playerRef.current || !playerReady) return;

    const player = playerRef.current;
    const targetPos = computeTargetPosition(
      lastSync.positionMs,
      lastSync.serverTimestamp,
      Date.now(),
      lastSync.playbackRate
    );

    const currentPos = player.getCurrentTime() * 1000;
    const error = getPositionError(targetPos, currentPos);
    setDriftMs(error);
    setCurrentPosition(currentPos);

    // Apply correction
    const absError = Math.abs(error);
    if (absError > 500) {
      player.seekTo(targetPos / 1000, true);
      console.log(`[SYNC] Hard seek: ${error.toFixed(0)}ms`);
    } else if (absError > 80) {
      const rate = error > 0 ? 1.05 : 0.95;
      player.setPlaybackRate(rate);
      setTimeout(() => player.setPlaybackRate(1), 2000);
      console.log(`[SYNC] Nudge: ${error.toFixed(0)}ms`);
    }

    // Sync play/pause state
    if (lastSync.playing && player.getPlayerState() !== window.YT.PlayerState.PLAYING) {
      player.playVideo();
    } else if (!lastSync.playing && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
      player.pauseVideo();
    }
  }, [lastSync, playerReady]);

  const handleJoin = () => {
    if (!roomId.trim() || !userName.trim()) return;
    joinRoom(roomId.trim(), userName, userName);
    setJoined(true);
  };

  const handlePlay = () => {
    if (!playerRef.current) return;
    playerRef.current.playVideo();
    play(roomId);
  };

  const handlePause = () => {
    if (!playerRef.current) return;
    const pos = playerRef.current.getCurrentTime() * 1000;
    playerRef.current.pauseVideo();
    pause(roomId, pos);
  };

  const handleChangeTrack = () => {
    changeTrack(roomId, TEST_TRACK.videoId);
    if (playerRef.current) {
      playerRef.current.loadVideoById(TEST_TRACK.videoId);
    }
  };

  const driftColor =
    Math.abs(driftMs) < 80 ? 'bg-green-500' : Math.abs(driftMs) < 500 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
      {/* Hidden YouTube player */}
      <div id="yt-player" className="absolute w-0 h-0 opacity-0 pointer-events-none" />

      {!joined ? (
        // Join screen
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-center">🎵 Unison</h1>
          <p className="text-zinc-400 text-center text-sm">YouTube Music Listen Along</p>

          <div className="space-y-2">
            <input
              className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-sm"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <input
              className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-sm"
              placeholder="Your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <button
              className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 font-medium disabled:opacity-50"
              onClick={handleJoin}
              disabled={!isConnected}
            >
              {isConnected ? 'Join Room' : 'Connecting...'}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Server connected' : 'Server disconnected'}
          </div>
        </div>
      ) : (
        // Room screen
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Room: {roomId}</h1>
              <p className="text-xs text-zinc-500">{users.length} listener{users.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${driftColor}`} title={`Drift: ${driftMs.toFixed(0)}ms`} />
              <span className="text-xs text-zinc-500">{Math.abs(driftMs).toFixed(0)}ms drift</span>
            </div>
          </div>

          {/* Album Art */}
          <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={TEST_TRACK.thumbnailUrl}
              alt={TEST_TRACK.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Track Info */}
          <div>
            <h2 className="font-semibold">{TEST_TRACK.title}</h2>
            <p className="text-sm text-zinc-400">{TEST_TRACK.channelName}</p>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${lastSync ? Math.min((currentPosition / 253000) * 100, 100) : 0}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-2xl"
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={!playerReady}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>

          <button
            className="w-full py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
            onClick={handleChangeTrack}
          >
            Load Test Track
          </button>

          {/* Users */}
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase">Listeners</p>
            {users.map((u) => (
              <div key={u.userId} className="text-sm text-zinc-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {u.userName}
                {roomState?.room.leaderId === u.userId && (
                  <span className="text-xs text-indigo-400">(DJ)</span>
                )}
              </div>
            ))}
          </div>

          {/* Debug */}
          <details className="text-xs text-zinc-600">
            <summary>Debug</summary>
            <pre className="mt-2 p-2 bg-zinc-900 rounded overflow-auto max-h-40">
              {JSON.stringify({ isConnected, playerReady, isPlaying, driftMs, lastSync }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}