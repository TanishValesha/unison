'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SyncMessage, RoomStateMessage, UserJoinedMessage, UserLeftMessage } from '@unison/shared';

const SERVER_URL = 'http://localhost:3001';

interface UseSocketReturn {
  isConnected: boolean;
  roomState: RoomStateMessage | null;
  users: UserJoinedMessage['users'];
  lastSync: SyncMessage | null;
  joinRoom: (roomId: string, userId: string, userName: string) => void;
  play: (roomId: string) => void;
  pause: (roomId: string, positionMs: number) => void;
  seek: (roomId: string, positionMs: number) => void;
  changeTrack: (roomId: string, trackId: string) => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomStateMessage | null>(null);
  const [users, setUsers] = useState<UserJoinedMessage['users']>([]);
  const [lastSync, setLastSync] = useState<SyncMessage | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[WS] Disconnected');
      setIsConnected(false);
    });

    socket.on('ROOM_STATE', (msg: RoomStateMessage) => {
      console.log('[WS] ROOM_STATE:', msg);
      setRoomState(msg);
      setUsers(msg.users);
    });

    socket.on('SYNC', (msg: SyncMessage) => {
      setLastSync(msg);
    });

    socket.on('USER_JOINED', (msg: UserJoinedMessage) => {
      setUsers(msg.users);
    });

    socket.on('USER_LEFT', (msg: UserLeftMessage) => {
      setUsers(msg.users);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((roomId: string, userId: string, userName: string) => {
    socketRef.current?.emit('JOIN', { roomId, userId, userName });
  }, []);

  const play = useCallback((roomId: string) => {
    socketRef.current?.emit('PLAY', { roomId });
  }, []);

  const pause = useCallback((roomId: string, positionMs: number) => {
    socketRef.current?.emit('PAUSE', { roomId, positionMs });
  }, []);

  const seek = useCallback((roomId: string, positionMs: number) => {
    socketRef.current?.emit('SEEK', { roomId, positionMs });
  }, []);

  const changeTrack = useCallback((roomId: string, trackId: string) => {
    socketRef.current?.emit('CHANGE_TRACK', { roomId, trackId });
  }, []);

  return {
    isConnected,
    roomState,
    users,
    lastSync,
    joinRoom,
    play,
    pause,
    seek,
    changeTrack,
  };
}