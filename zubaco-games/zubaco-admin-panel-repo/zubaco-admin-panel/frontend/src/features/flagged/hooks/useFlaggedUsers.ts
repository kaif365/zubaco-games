import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import { fetchFlaggedUsers, updateFlaggedStatus } from "@/services/flagged";
import type { FlagStatus } from "@/types/flagged";

interface UseFlaggedParams {
  page: number;
  pageSize: number;
  search: string;
  status: string;
}

export function useFlaggedUsers({ page, pageSize, search, status }: UseFlaggedParams) {
  const params = { page, pageSize, search, status: status === "all" ? undefined : status };

  return useQuery({
    queryKey: QUERY_KEYS.FLAGGED.LIST(params),
    queryFn: () => fetchFlaggedUsers({ page, pageSize, search, status: status === "all" ? undefined : status }),
    placeholderData: (prev) => prev,
  });
}

export function useUpdateFlagStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FlagStatus }) =>
      updateFlaggedStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FLAGGED.ALL });
    },
  });
}
