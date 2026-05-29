import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/query-keys';
import {
  createGame,
  deleteGame,
  fetchAdminGames,
  fetchGameById,
  fetchGames,
  patchGameById,
  type FetchGamesParams,
  type UpdateGameRequest,
} from '@/lib/api/endpoints/games';

export function useGamesQuery(
  params: Omit<FetchGamesParams, 'token'>,
  options: { enabled?: boolean } = {},
) {
  const queryParams = {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    status: params.status,
  };

  return useQuery({
    queryKey: QUERY_KEYS.GAMES.LIST(queryParams),
    queryFn: () => fetchGames(queryParams),
    placeholderData: (prev) => prev,
    enabled: options.enabled ?? true,
  });
}

export function useGameByIdQuery(
  id: string,
  params?: { token?: string; stage_id?: string },
) {
  return useQuery({
    queryKey: QUERY_KEYS.GAMES.DETAIL(id, { stage_id: params?.stage_id }),
    queryFn: () => fetchGameById(id, params?.token, params?.stage_id),
    enabled: Boolean(id),
  });
}

export function useAdminGamesQuery(params?: {
  search?: string;
  token?: string;
}) {
  return useQuery({
    queryKey: [QUERY_KEYS.GAMES.ADMIN_LIST, params?.search],
    queryFn: () => fetchAdminGames(params),
  });
}

export interface UpdateGameInput {
  id: string;
  payload: UpdateGameRequest;
  token?: string;
  stageId?: string;
}

export function useUpdateGameMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload, token }: UpdateGameInput) =>
      patchGameById(id, payload, token),
    onSuccess: (data, variables) => {
      // Invalidate all game queries so list views also update
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GAMES.ALL });
      // If the mutation returned updated data, push it straight into the cache
      // so the UI reflects changes immediately without waiting for a refetch
      if (data) {
        queryClient.setQueriesData(
          { queryKey: ['games', 'detail', variables.id] },
          data,
        );
      }
    },
  });
}

export interface UpdateGameByIdInput {
  id: string;
  payload: UpdateGameRequest;
  token?: string;
  stageId?: string;
}

export function useUpdateGameByIdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload, token, stageId }: UpdateGameByIdInput) =>
      patchGameById(id, payload, token, stageId),
    onSuccess: (data, variables) => {
      // Invalidate all game queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GAMES.ALL });
      
      // Update specific game cache
      if (data) {
        queryClient.setQueriesData(
          { queryKey: QUERY_KEYS.GAMES.DETAIL(variables.id, { stage_id: variables.stageId }) },
          data,
        );
      }
    },
  });
}

export function useCreateGameMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      token,
    }: {
      payload: UpdateGameRequest;
      token?: string;
    }) => createGame(payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GAMES.ALL });
    },
  });
}
export function useDeleteGameMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteGame(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GAMES.ALL });
    },
  });
}
