import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

import { appConfig } from '@app/config/appConfig';

export type SocketStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

class SocketManager {
  private socket: Socket | null = null;

  connect(): Socket | null {
    if (!appConfig.socket.url) return null;
    if (this.socket?.connected) return this.socket;

    const token = localStorage.getItem('auth_token');

    this.socket = io(appConfig.socket.url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      ...(token ? { auth: { token } } : {}),
    });

    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketManager = new SocketManager();
