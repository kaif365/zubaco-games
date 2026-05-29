import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import { fetchStageDetail } from "@/services/stages";

export function useStageSummary(stageId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...QUERY_KEYS.STAGES.DETAIL(stageId), { summary: true }],
    queryFn: () => fetchStageDetail(stageId, { page: 1, pageSize: 1 }),
    placeholderData: (prev) => prev,
    enabled: Boolean(stageId) && enabled,
  });
}
