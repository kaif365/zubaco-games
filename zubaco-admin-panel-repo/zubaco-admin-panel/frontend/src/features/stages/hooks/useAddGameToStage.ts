import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import { addGamesToStage } from "@/services/stages";

export function useAddGamesToStage(stageId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameIds: string | string[]) =>
      addGamesToStage(stageId, gameIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.STAGES.DETAIL(stageId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STAGES.ALL });
    },
  });
}
