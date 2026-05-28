import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { gameApi } from '@/api/gameApi';
import { AUTH_TOKEN_KEY } from '@/lib/devSessionAuth';
import { useAuthGate } from '@/hooks/useAuthGate';

vi.mock('@/api/gameApi', () => ({
  gameApi: {
    getGameConfig: vi.fn(),
  },
}));

const mockGetGameConfig = vi.mocked(gameApi.getGameConfig);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAuthGate', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mockGetGameConfig.mockResolvedValue({
      gameTimeLimitSeconds: 120,
      totalLevels: 3,
      showDemo: true,
      stageNumber: 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('fetches dev session when no token is stored', async () => {
    vi.stubEnv('VITE_MOCK_USER_URL', 'http://mock.test');
    vi.stubEnv('VITE_STAGE_ID', 'stage-1');

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 201,
        message: 'Success',
        data: { token: 'token', expiresAt: '', stageId: 'stage-1', user: { id: '1', name: 'P' } },
      }),
    } as Response);

    const { result } = renderHook(() => useAuthGate(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('token');
    expect(mockGetGameConfig).toHaveBeenCalled();
  });

  it('skips dev-session fetch when a token already exists', async () => {
    vi.stubEnv('VITE_MOCK_USER_URL', 'http://mock.test');
    vi.stubEnv('VITE_STAGE_ID', 'stage-1');
    localStorage.setItem(AUTH_TOKEN_KEY, 'existing-token');

    const fetchMock = vi.spyOn(global, 'fetch');

    const { result } = renderHook(() => useAuthGate(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockGetGameConfig).toHaveBeenCalled();
  });

  it('surfaces config errors on the auth gate', async () => {
    vi.stubEnv('VITE_MOCK_USER_URL', 'http://mock.test');
    vi.stubEnv('VITE_STAGE_ID', 'stage-1');
    localStorage.setItem(AUTH_TOKEN_KEY, 'existing-token');
    mockGetGameConfig.mockRejectedValue(new Error('Config unavailable'));

    const { result } = renderHook(() => useAuthGate(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.error).toBe('Config unavailable');
    });

    expect(result.current.isReady).toBe(false);
  });
});
