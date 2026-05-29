import { useMutation } from '@tanstack/react-query';

import type { GameOverRequest } from '@app-types/api.types';

import { gameApi } from '../api/game.api';

/**
 * Hook for game over.
 *
 * @returns {Override<MutationObserverResult<GameOverResponse, Error, GameOverRequest, unknown>, { mutate: UseMutateFunction<GameOverResponse, Error, GameOverRequest, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<GameOverResponse, Error, GameOverRequest, unknown>; }} The result of useGameOver.
 */
export function useGameOver() {
  return useMutation({
    mutationFn: (body: GameOverRequest) => gameApi.gameOver(body),
  });
}
