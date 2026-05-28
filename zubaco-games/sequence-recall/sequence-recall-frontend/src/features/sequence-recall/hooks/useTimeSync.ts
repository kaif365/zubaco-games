import { useQuery } from '@tanstack/react-query';

import { gameApi } from '../api/game.api';
import { gameKeys } from '../api/game.keys';

// Polls every 5s while a real session is active (sessionId present).
// Stops automatically when sessionId is cleared (game over / back to lobby).
/**
 * Hook for time sync.
 *
 * @param {string | null} sessionId - The session id.
 *
 * @returns {DefinedQueryObserverResult<TimeSyncResponse, Error> | QueryObserverLoadingErrorResult<TimeSyncResponse, Error> | QueryObserverLoadingResult<TimeSyncResponse, Error> | QueryObserverPendingResult<TimeSyncResponse, Error> | QueryObserverPlaceholderResult<TimeSyncResponse, Error>} The result of useTimeSync.
 */
export function useTimeSync(sessionId: string | null) {
  return useQuery({
    queryKey: gameKeys.timeSync(sessionId ?? ''),
    queryFn: () => {
      if (!sessionId) {
        throw new Error('Session ID is required to poll time sync');
      }

      return gameApi.timeSync(sessionId);
    },
    enabled: Boolean(sessionId),
    refetchInterval: 5_000,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}
