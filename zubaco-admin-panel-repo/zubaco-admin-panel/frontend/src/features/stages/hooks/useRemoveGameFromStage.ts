import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import { removeGamesFromStage } from "@/services/stages";

export function useRemoveGamesFromStage(stageId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameIds: string | string[]) =>
      removeGamesFromStage(stageId, gameIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.STAGES.DETAIL(stageId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STAGES.ALL });
    },
  });
}
