import { renderHook } from '@testing-library/react';

import { useSocketContext } from '../app/providers/SocketProvider';
import { useSocketEvent, useSocketStatus, useSocketEmit } from '../hooks/useSocket';

/* eslint-disable @typescript-eslint/no-unsafe-return */
jest.mock('../app/providers/SocketProvider', () => ({
  ...jest.requireActual('../app/providers/SocketProvider'),
  useSocketContext: jest.fn(),
}));
/* eslint-enable @typescript-eslint/no-unsafe-return */

describe('useSocket hooks', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSocketContext as jest.Mock).mockReturnValue({
      socket: mockSocket,
      status: 'connected',
    });
  });

  describe('useSocketEvent', () => {
    it('registers and unregisters event handler', () => {
      const handler = jest.fn();
      const { unmount } = renderHook(() => {
        useSocketEvent('test-event', handler);
      });

      expect(mockSocket.on).toHaveBeenCalledWith('test-event', handler);

      unmount();
      expect(mockSocket.off).toHaveBeenCalledWith('test-event', handler);
    });

    it('does nothing if socket is null', () => {
      (useSocketContext as jest.Mock).mockReturnValue({ socket: null, status: 'idle' });
      const handler = jest.fn();
      renderHook(() => {
        useSocketEvent('test-event', handler);
      });
      expect(mockSocket.on).not.toHaveBeenCalled();
    });
  });

  describe('useSocketStatus', () => {
    it('returns the socket status', () => {
      const { result } = renderHook(() => useSocketStatus());
      expect(result.current).toBe('connected');
    });
  });

  describe('useSocketEmit', () => {
    it('emits event with data', () => {
      const { result } = renderHook(() => useSocketEmit());
      result.current('my-event', { foo: 'bar' });
      expect(mockSocket.emit).toHaveBeenCalledWith('my-event', { foo: 'bar' });
    });
  });
});
