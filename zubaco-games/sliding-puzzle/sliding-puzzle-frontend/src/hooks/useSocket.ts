import { useEffect } from 'react';

import { useSocketContext } from '@app/providers/SocketProvider';
import type { SocketStatus } from '@services/socketClient';

export function useSocketEvent(event: string, handler: (data: unknown) => void): void {
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}

export function useSocketStatus(): SocketStatus {
  const { status } = useSocketContext();
  return status;
}

export function useSocketEmit() {
  const { socket } = useSocketContext();

  return function emit(event: string, data?: unknown): void {
    socket?.emit(event, data);
  };
}
