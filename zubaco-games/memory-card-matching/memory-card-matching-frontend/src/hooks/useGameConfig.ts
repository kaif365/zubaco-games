import { useQuery } from '@tanstack/react-query';

import { gameConfigQueryOptions } from '@/api/gameConfig.query';
import type { GameConfig } from '@/models/game.types';

interface UseGameConfigResult {
  config: GameConfig | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetches and caches the admin-assigned game configuration from the backend.
 *
 * @returns {UseGameConfigResult} Query state and the resolved game config.
 */
export const useGameConfig = (options?: { enabled?: boolean }): UseGameConfigResult => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    ...gameConfigQueryOptions(),
    enabled: options?.enabled ?? true,
  });

  return {
    config: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
};
