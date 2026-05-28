import { io } from 'socket.io-client';

import { socketManager } from '../services/socketClient';

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

// Mock appConfig
jest.mock('@app/config/appConfig', () => ({
  appConfig: {
    socket: {
      url: 'http://localhost:3000',
    },
  },
}));

describe('SocketManager', () => {
  interface MockSocket {
    connected: boolean;
    disconnect: jest.Mock;
    on: jest.Mock;
    off: jest.Mock;
  }

  const mockSocket: MockSocket = {
    connected: false,
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };

  beforeEach(() => {
    socketManager.disconnect();
    jest.clearAllMocks();
    (io as jest.Mock).mockReturnValue(mockSocket);
  });

  it('connects when a URL is provided', () => {
    socketManager.connect();
    expect(io).toHaveBeenCalledWith('http://localhost:3000', expect.any(Object));
  });

  it('does not connect if already connected', () => {
    mockSocket.connected = true;
    socketManager.connect();
    socketManager.connect();
    expect(io).toHaveBeenCalledTimes(1);
    mockSocket.connected = false;
  });

  it('disconnects correctly', () => {
    socketManager.connect();
    socketManager.disconnect();
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(socketManager.getSocket()).toBeNull();
  });
});
