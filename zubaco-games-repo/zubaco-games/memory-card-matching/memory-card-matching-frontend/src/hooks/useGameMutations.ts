import { useMutation } from '@tanstack/react-query';
import { gameApi } from '@/api/gameApi';
import type {
  AnalyticsEventPayload,
  AnalyticsEventName,
  GameOverPayload,
  SaveProgressPayload,
} from '@/models/game.types';

export const useCompleteBoard = () =>
  useMutation({
    mutationFn: () => gameApi.completeBoard(),
    onError: (err) => console.error('[useCompleteBoard]', err),
  });

/**
 * Mutation hook for creating a new game session and receiving the first level.
 *
 * @returns {UseMutationResult} Mutation state and trigger for starting a game.
 */
export const useStartGame = () =>
  useMutation({
    mutationFn: () => gameApi.startGame(),
    onError: (err) => console.error('[useStartGame]', err),
  });

/**
 * Mutation hook for silently prefetching the next level at 10% completion.
 *
 * @returns {UseMutationResult} Mutation state and trigger for fetching the next level.
 */
export const usePrefetchNextLevel = () =>
  useMutation({
    mutationFn: (sessionId: string) => gameApi.getNextLevel(sessionId),
    onError: (err) => console.error('[usePrefetchNextLevel]', err),
  });

/**
 * Mutation hook for persisting matched-pair progress after each successful match.
 *
 * @returns {UseMutationResult} Mutation state and trigger for saving progress.
 */
export const useSaveProgress = () =>
  useMutation({
    mutationFn: (payload: SaveProgressPayload) => gameApi.saveProgress(payload),
    onError: (err) => console.error('[useSaveProgress]', err),
  });

/**
 * Mutation hook for closing the session and retrieving the final score and rank.
 *
 * @returns {UseMutationResult} Mutation state and trigger for the game-over API call.
 */
export const useGameOver = () =>
  useMutation({
    mutationFn: (payload: GameOverPayload) => gameApi.gameOver(payload),
    onError: (err) => console.error('[useGameOver]', err),
  });

/**
 * Mutation hook for firing a single analytics event to the API.
 *
 * @returns {UseMutationResult} Mutation state and trigger for tracking an event.
 */
export const useTrackAnalyticsEvent = () =>
  useMutation({
    mutationFn: (payload: AnalyticsEventPayload) => gameApi.trackEvent(payload),
    onError: (err) => console.error('[useTrackAnalyticsEvent]', err),
  });

/**
 * Returns a convenience callback that fires an analytics event with optional payload data.
 *
 * @returns {(event: AnalyticsEventName, data?: Record<string, unknown>) => void} Event-fire callback.
 */
export const useFireAnalyticsEvent = () => {
  const mutation = useTrackAnalyticsEvent();
  return (event: AnalyticsEventName, data?: Record<string, unknown>) => {
    mutation.mutate({ event, timestamp: Date.now(), data });
  };
};
