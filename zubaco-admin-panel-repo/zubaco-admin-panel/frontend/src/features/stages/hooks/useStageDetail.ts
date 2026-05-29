import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import type { PaginationParams, FilterParams } from "@/types/common";
import { fetchStageDetail } from "@/services/stages";

export function useStageDetail(
  id: string,
  params?: PaginationParams & FilterParams,
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.STAGES.DETAIL(id), params],
    queryFn: () => fetchStageDetail(id, params),
    placeholderData: (prev) => prev,
    enabled: !!id,
  });
}
