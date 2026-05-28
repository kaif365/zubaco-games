import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getGameRepository, resetGameRepository } from '@/store/gameRepositoryStore';
import type { GameConfig, TileId } from '@/types/game';

export const GAME_STATE_QUERY_KEY = ['game-state'] as const;

/**
 * Hook for game state query.
 *
 * @param {GameConfig | null} config - The config.
 * @param {boolean} enabled - The enabled.
 *
 * @returns {DefinedQueryObserverResult<GameState, Error> | QueryObserverLoadingErrorResult<GameState, Error> | QueryObserverLoadingResult<GameState, Error> | QueryObserverPendingResult<GameState, Error> | QueryObserverPlaceholderResult<GameState, Error>} The result of useGameStateQuery.
 */
export function useGameStateQuery(config: GameConfig | null, enabled: boolean) {
  return useQuery({
    queryKey: GAME_STATE_QUERY_KEY,
    enabled: enabled && Boolean(config),
    queryFn: async () => getGameRepository(config as GameConfig).getInitialState(),
  });
}

/**
 * Hook for start game.
 *
 * @param {GameConfig | null} config - The config.
 *
 * @returns {Override<MutationObserverResult<GameState, Error, void, unknown>, { mutate: UseMutateFunction<GameState, Error, void, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<GameState, Error, void, unknown>; }} The result of useStartGame.
 */
export function useStartGame(config: GameConfig | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => getGameRepository(config as GameConfig).startGame(),
    onSuccess: (state) => queryClient.setQueryData(GAME_STATE_QUERY_KEY, state),
  });
}

/**
 * Hook for fresh start game.
 *
 * @param {GameConfig | null} config - The config.
 *
 * @returns {Override<MutationObserverResult<GameState, Error, void, unknown>, { mutate: UseMutateFunction<GameState, Error, void, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<GameState, Error, void, unknown>; }} The result of useFreshStartGame.
 */
export function useFreshStartGame(config: GameConfig | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => resetGameRepository(config as GameConfig).startGame(),
    onSuccess: (state) => queryClient.setQueryData(GAME_STATE_QUERY_KEY, state),
  });
}

/**
 * Hook for fresh reset game.
 *
 * @param {GameConfig | null} config - The config.
 *
 * @returns {Override<MutationObserverResult<GameState, Error, void, unknown>, { mutate: UseMutateFunction<GameState, Error, void, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<GameState, Error, void, unknown>; }} The result of useFreshResetGame.
 */
export function useFreshResetGame(config: GameConfig | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => resetGameRepository(config as GameConfig).restartGame(),
    onSuccess: (state) => queryClient.setQueryData(GAME_STATE_QUERY_KEY, state),
  });
}

/**
 * Hook for finish playback.
 *
 * @param {GameConfig | null} config - The config.
 *
 * @returns {Override<MutationObserverResult<GameState, Error, void, unknown>, { mutate: UseMutateFunction<GameState, Error, void, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<GameState, Error, void, unknown>; }} The result of useFinishPlayback.
 */
export function useFinishPlayback(config: GameConfig | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => getGameRepository(config as GameConfig).finishPlayback(),
    onSuccess: (state) => queryClient.setQueryData(GAME_STATE_QUERY_KEY, state),
  });
}

/**
 * Hook for submit move.
 *
 * @param {GameConfig | null} config - The config.
 *
 * @returns {Override<MutationObserverResult<SubmitMoveResponse, Error, number, unknown>, { mutate: UseMutateFunction<SubmitMoveResponse, Error, number, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<SubmitMoveResponse, Error, number, unknown>; }} The result of useSubmitMove.
 */
export function useSubmitMove(config: GameConfig | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tileId: TileId) =>
      getGameRepository(config as GameConfig).submitMove({ tileId }),
    onSuccess: (result) => queryClient.setQueryData(GAME_STATE_QUERY_KEY, result.state),
  });
}

/**
 * Hook for replay round.
 *
 * @param {GameConfig | null} config - The config.
 *
 * @returns {Override<MutationObserverResult<GameState, Error, void, unknown>, { mutate: UseMutateFunction<GameState, Error, void, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<GameState, Error, void, unknown>; }} The result of useReplayRound.
 */
export function useReplayRound(config: GameConfig | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => getGameRepository(config as GameConfig).replayCurrentRound(),
    onSuccess: (state) => queryClient.setQueryData(GAME_STATE_QUERY_KEY, state),
  });
}

/**
 * Hook for restart game.
 *
 * @param {GameConfig | null} config - The config.
 *
 * @returns {Override<MutationObserverResult<GameState, Error, void, unknown>, { mutate: UseMutateFunction<GameState, Error, void, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<GameState, Error, void, unknown>; }} The result of useRestartGame.
 */
export function useRestartGame(config: GameConfig | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => resetGameRepository(config as GameConfig).restartGame(),
    onSuccess: (state) => queryClient.setQueryData(GAME_STATE_QUERY_KEY, state),
  });
}

// Ends the whole session when the session-level timer expires
/**
 * Hook for session timeout game.
 *
 * @param {GameConfig | null} config - The config.
 *
 * @returns {Override<MutationObserverResult<GameState, Error, void, unknown>, { mutate: UseMutateFunction<GameState, Error, void, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<GameState, Error, void, unknown>; }} The result of useSessionTimeoutGame.
 */
export function useSessionTimeoutGame(config: GameConfig | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => getGameRepository(config as GameConfig).sessionTimeoutGame(),
    onSuccess: (state) => queryClient.setQueryData(GAME_STATE_QUERY_KEY, state),
  });
}
