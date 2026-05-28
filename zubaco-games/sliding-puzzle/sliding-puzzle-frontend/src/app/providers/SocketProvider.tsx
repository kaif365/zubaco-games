import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';

import { appConfig } from '@app/config/appConfig';
import { socketManager, type SocketStatus } from '@services/socketClient';

export interface SocketContextValue {
  socket: Socket | null;
  status: SocketStatus;
}

/* eslint-disable-next-line react-refresh/only-export-components */
export const SocketContext = createContext<SocketContextValue>({ socket: null, status: 'idle' });

export function SocketProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<SocketStatus>('idle');

  useEffect(() => {
    if (!appConfig.socket.url) return;

    const s = socketManager.connect();
    if (!s) return;

    setSocket(s);
    setStatus('connecting');

    const onConnect = () => {
      setStatus('connected');
    };
    const onDisconnect = () => {
      setStatus('disconnected');
    };
    const onError = () => {
      setStatus('error');
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onError);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onError);
      socketManager.disconnect();
      setSocket(null);
      setStatus('idle');
    };
  }, []);

  const value = useMemo(() => ({ socket, status }), [socket, status]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

/* eslint-disable-next-line react-refresh/only-export-components */
export function useSocketContext(): SocketContextValue {
  return useContext(SocketContext);
}
