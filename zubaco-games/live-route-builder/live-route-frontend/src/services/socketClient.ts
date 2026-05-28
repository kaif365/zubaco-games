import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

export type SocketStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL ?? '';

class SocketManager {
  private socket: Socket | null = null;

  connect(): Socket | null {
    if (!SOCKET_URL) return null;
    if (this.socket?.connected) return this.socket;
    const token = localStorage.getItem('auth_token');
    this.socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
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
