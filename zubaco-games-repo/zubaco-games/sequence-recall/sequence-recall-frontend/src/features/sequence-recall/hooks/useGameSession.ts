import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { gameConfigProvider } from '@/features/sequence-recall/repositories/repositoryInstances';

/**
 * Hook for game session.
 *
 * @returns {{ label: string; data: PlayerSession; error: Error; isError: true; isPending: false; isLoading: false; isLoadingError: false; isRefetchError: true; isSuccess: false; isPlaceholderData: false; status: "error"; dataUpdatedAt: number; errorUpdatedAt: number; failureCount: number; failureReason: Error | null; errorUpdateCount: number; isFetched: boolean; isFetchedAfterMount: boolean; isFetching: boolean; isInitialLoading: boolean; isPaused: boolean; isRefetching: boolean; isStale: boolean; isEnabled: boolean; refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<PlayerSession, Error>>; fetchStatus: FetchStatus; promise: Promise<PlayerSession>; } | { label: string; data: PlayerSession; error: null; isError: false; isPending: false; isLoading: false; isLoadingError: false; isRefetchError: false; isSuccess: true; isPlaceholderData: false; status: "success"; dataUpdatedAt: number; errorUpdatedAt: number; failureCount: number; failureReason: Error | null; errorUpdateCount: number; isFetched: boolean; isFetchedAfterMount: boolean; isFetching: boolean; isInitialLoading: boolean; isPaused: boolean; isRefetching: boolean; isStale: boolean; isEnabled: boolean; refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<PlayerSession, Error>>; fetchStatus: FetchStatus; promise: Promise<PlayerSession>; } | { label: string; data: undefined; error: Error; isError: true; isPending: false; isLoading: false; isLoadingError: true; isRefetchError: false; isSuccess: false; isPlaceholderData: false; status: "error"; dataUpdatedAt: number; errorUpdatedAt: number; failureCount: number; failureReason: Error | null; errorUpdateCount: number; isFetched: boolean; isFetchedAfterMount: boolean; isFetching: boolean; isInitialLoading: boolean; isPaused: boolean; isRefetching: boolean; isStale: boolean; isEnabled: boolean; refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<PlayerSession, Error>>; fetchStatus: FetchStatus; promise: Promise<PlayerSession>; } | { label: string; data: undefined; error: null; isError: false; isPending: true; isLoading: true; isLoadingError: false; isRefetchError: false; isSuccess: false; isPlaceholderData: false; status: "pending"; dataUpdatedAt: number; errorUpdatedAt: number; failureCount: number; failureReason: Error | null; errorUpdateCount: number; isFetched: boolean; isFetchedAfterMount: boolean; isFetching: boolean; isInitialLoading: boolean; isPaused: boolean; isRefetching: boolean; isStale: boolean; isEnabled: boolean; refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<PlayerSession, Error>>; fetchStatus: FetchStatus; promise: Promise<PlayerSession>; } | { label: string; data: undefined; error: null; isError: false; isPending: true; isLoadingError: false; isRefetchError: false; isSuccess: false; isPlaceholderData: false; status: "pending"; dataUpdatedAt: number; errorUpdatedAt: number; failureCount: number; failureReason: Error | null; errorUpdateCount: number; isFetched: boolean; isFetchedAfterMount: boolean; isFetching: boolean; isLoading: boolean; isInitialLoading: boolean; isPaused: boolean; isRefetching: boolean; isStale: boolean; isEnabled: boolean; refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<PlayerSession, Error>>; fetchStatus: FetchStatus; promise: Promise<PlayerSession>; } | { label: string; data: PlayerSession; isError: false; error: null; isPending: false; isLoading: false; isLoadingError: false; isRefetchError: false; isSuccess: true; isPlaceholderData: true; status: "success"; dataUpdatedAt: number; errorUpdatedAt: number; failureCount: number; failureReason: Error | null; errorUpdateCount: number; isFetched: boolean; isFetchedAfterMount: boolean; isFetching: boolean; isInitialLoading: boolean; isPaused: boolean; isRefetching: boolean; isStale: boolean; isEnabled: boolean; refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<PlayerSession, Error>>; fetchStatus: FetchStatus; promise: Promise<PlayerSession>; }} The result of useGameSession.
 */
export function useGameSession() {
  const query = useQuery({
    queryKey: ['player-session'],
    queryFn: () => gameConfigProvider.getPlayerSession(),
  });
  const label = useMemo(
    () =>
      query.data
        ? `${query.data.nickname} - best ${String(query.data.bestScore)}`
        : 'Loading pilot profile...',
    [query.data],
  );
  return { ...query, label };
}
