import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import {
  fetchTournaments,
  deleteTournaments,
  fetchTournamentById,
  updateTournament,
  createTournament,
  addStagesToTournament,
  removeStagesFromTournament,
  type FetchTournamentsParams,
  type CreateTournamentPayload,
  type DeleteTournamentsPayload,
  type UpdateTournamentPayload,
} from "@/services/tournaments";

export function useTournaments(params: Omit<FetchTournamentsParams, "token">) {
  return useQuery({
    queryKey: QUERY_KEYS.TOURNAMENTS.LIST(params),
    queryFn: () => fetchTournaments(params),
    placeholderData: (prev) => prev,
  });
}

export function useDeleteTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeleteTournamentsPayload) =>
      deleteTournaments(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOURNAMENTS.ALL });
    },
  });
}

export function useTournamentById(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.TOURNAMENTS.DETAIL(id),
    queryFn: () => fetchTournamentById(id),
    enabled: Boolean(id),
  });
}

export function useCreateTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTournamentPayload) => createTournament(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOURNAMENTS.ALL });
    },
  });
}

export function useUpdateTournament(tournamentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTournamentPayload) =>
      updateTournament(tournamentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOURNAMENTS.ALL });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TOURNAMENTS.DETAIL(tournamentId),
      });
    },
  });
}

export function useAddStagesToTournament(tournamentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stageIds: string[]) =>
      addStagesToTournament({
        tournament_id: tournamentId,
        stage_ids: stageIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TOURNAMENTS.DETAIL(tournamentId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TOURNAMENTS.ASSIGNED_STAGE_IDS(tournamentId),
      });
    },
  });
}

export function useRemoveStagesFromTournament(tournamentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stageIds: string | string[]) =>
      removeStagesFromTournament(tournamentId, stageIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TOURNAMENTS.DETAIL(tournamentId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TOURNAMENTS.ASSIGNED_STAGE_IDS(tournamentId),
      });
    },
  });
}
