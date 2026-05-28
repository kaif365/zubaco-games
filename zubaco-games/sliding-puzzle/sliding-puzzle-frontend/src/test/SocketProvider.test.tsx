import { render, screen } from '@testing-library/react';

import { SocketContext, SocketProvider } from '../app/providers/SocketProvider';
import { socketManager } from '../services/socketClient';

// Mock appConfig
jest.mock('../app/config/appConfig', () => ({
  appConfig: {
    socket: {
      url: 'http://localhost:3001',
    },
  },
}));

// Mock socketManager
jest.mock('../services/socketClient', () => ({
  socketManager: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    getSocket: jest.fn(),
  },
}));

describe('SocketProvider', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (socketManager.connect as jest.Mock).mockReturnValue(mockSocket);
    (socketManager.getSocket as jest.Mock).mockReturnValue(mockSocket);
  });

  it('connects on mount and disconnects on unmount', () => {
    const { unmount } = render(
      <SocketProvider>
        <div>Test Child</div>
      </SocketProvider>,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(jest.mocked(socketManager.connect)).toHaveBeenCalled();

    unmount();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(jest.mocked(socketManager.disconnect)).toHaveBeenCalled();
  });

  it('provides socket status through context', () => {
    render(
      <SocketProvider>
        <SocketContext.Consumer>
          {(value) => <div>Status: {value.status}</div>}
        </SocketContext.Consumer>
      </SocketProvider>,
    );

    // Initial status is connecting
    expect(screen.getByText('Status: connecting')).toBeInTheDocument();
  });
});
