import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import { fetchStageAssignedGameIds } from "@/services/stages";

export function useStageAssignedGameIds(stageId: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.STAGES.ASSIGNED_GAME_IDS(stageId),
    queryFn: () => fetchStageAssignedGameIds(stageId),
    enabled: enabled && !!stageId,
    staleTime: 30_000,
  });
}
