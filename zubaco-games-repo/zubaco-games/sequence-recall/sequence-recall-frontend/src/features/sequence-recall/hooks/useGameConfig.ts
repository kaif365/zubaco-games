import { useQuery } from '@tanstack/react-query';

import { appConfig } from '@app/config/appConfig';

import { gameConfigQueryOptions } from '../api/gameConfig.query';

// Returns the raw API response. Both this hook and useGameConfigQuery share the
// same cache entry — only one network request is made regardless of how many
// components call either hook.
/**
 * Hook for game config.
 *
 * @returns {DefinedQueryObserverResult<GameConfigResponse, Error> | QueryObserverLoadingErrorResult<GameConfigResponse, Error> | QueryObserverLoadingResult<GameConfigResponse, Error> | QueryObserverPendingResult<GameConfigResponse, Error> | QueryObserverPlaceholderResult<GameConfigResponse, Error>} The result of useGameConfig.
 */
export function useGameConfig() {
  const stageId = appConfig.socket.stageId;

  return useQuery(gameConfigQueryOptions(stageId));
}
