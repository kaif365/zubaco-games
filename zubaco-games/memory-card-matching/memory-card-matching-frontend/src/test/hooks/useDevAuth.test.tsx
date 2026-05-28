import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { gameApi } from '@/api/gameApi';
import { useDevAuth } from '@/hooks/useDevAuth';

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

describe('useDevAuth', () => {
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

  it('stores token and becomes ready on successful dev-session response', async () => {
    vi.stubEnv('VITE_MOCK_USER_URL', 'http://192.180.1.190:5002');
    vi.stubEnv('VITE_STAGE_ID', 'd13e13c5-cd28-4ccf-82ea-c5b71a8edd11');

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 201,
        message: 'Success',
        data: {
          token: 'token',
          expiresAt: '2026-05-13T07:43:56.286Z',
          stageId: 'd13e13c5-cd28-4ccf-82ea-c5b71a8edd11',
          user: {
            id: 'b206f505-21cd-43f2-8250-51a44e4e480c',
            name: 'Player-b206f5',
          },
        },
      }),
    } as Response);

    const { result } = renderHook(() => useDevAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    expect(result.current.error).toBeNull();
    expect(localStorage.getItem('ZUBACO_auth_token')).toBe('token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockGetGameConfig).toHaveBeenCalled();
  });

  it('returns error when required env var is missing', async () => {
    vi.stubEnv('VITE_MOCK_USER_URL', '');
    vi.stubEnv('VITE_STAGE_ID', 'd13e13c5-cd28-4ccf-82ea-c5b71a8edd11');

    const fetchMock = vi.spyOn(global, 'fetch');
    const { result } = renderHook(() => useDevAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.error).toBe('Missing VITE_MOCK_USER_URL');
    });

    expect(result.current.isReady).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns API error when dev-session call fails', async () => {
    vi.stubEnv('VITE_MOCK_USER_URL', 'http://192.180.1.190:5002');
    vi.stubEnv('VITE_STAGE_ID', 'd13e13c5-cd28-4ccf-82ea-c5b71a8edd11');

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        statusCode: 500,
        message: 'Service unavailable',
        data: null,
      }),
    } as Response);

    const { result } = renderHook(() => useDevAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.error).toBe('Service unavailable');
    });
    expect(result.current.isReady).toBe(false);
  });
});
