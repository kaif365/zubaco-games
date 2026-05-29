import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import { fetchTournamentAssignedStageIds } from "@/services/tournaments";

export function useTournamentAssignedStageIds(
  tournamentId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: QUERY_KEYS.TOURNAMENTS.ASSIGNED_STAGE_IDS(tournamentId),
    queryFn: () => fetchTournamentAssignedStageIds(tournamentId),
    enabled: enabled && !!tournamentId,
    staleTime: 30_000,
  });
}
