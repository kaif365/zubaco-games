import { useMutation } from '@tanstack/react-query';

import type { GameStartRequest } from '@app-types/api.types';

import { gameApi } from '../api/game.api';

/**
 * Hook for game start.
 *
 * @returns {Override<MutationObserverResult<GameStartResponse, Error, GameStartRequest, unknown>, { mutate: UseMutateFunction<GameStartResponse, Error, GameStartRequest, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<GameStartResponse, Error, GameStartRequest, unknown>; }} The result of useGameStart.
 */
export function useGameStart() {
  return useMutation({
    mutationFn: (body: GameStartRequest) => gameApi.start(body),
  });
}
