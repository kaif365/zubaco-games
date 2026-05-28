import { useEffect, useCallback, useRef, useState } from 'react';
import { socketManager, type SocketStatus } from '../services/socketClient';
import type { Socket } from 'socket.io-client';

export function useSocket() {
  const [status, setStatus] = useState<SocketStatus>('idle');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = socketManager.connect();
    if (!socket) return;
    socketRef.current = socket;
    setStatus('connecting');

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('error'));

    return () => {
      socketManager.disconnect();
      socketRef.current = null;
      setStatus('idle');
    };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (data: any) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  return { socket: socketRef.current, status, emit, on };
}
