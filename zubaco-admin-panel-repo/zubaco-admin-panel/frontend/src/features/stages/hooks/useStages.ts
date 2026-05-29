import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import { fetchStages, createStage, deleteStage, updateStage } from "@/services/stages";
import type { FetchStagesParams } from "@/services/stages";

export function useStages(
  params: FetchStagesParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: QUERY_KEYS.STAGES.LIST(params),
    queryFn: () => fetchStages(params),
    enabled: options.enabled ?? true,
  });
}

export function useCreateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      stage_number: number;
      stage_name: string;
      gameIds: string[];
    }) => createStage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STAGES.ALL });
    },
  });
}

export function useDeleteStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stageId: string) => deleteStage(stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STAGES.ALL });
    },
  });
}

export function useUpdateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      stageId: string;
      stage_number: number;
      stage_name: string;
      gameIds: string[];
    }) =>
      updateStage(
        args.stageId,
        {
          stage_number: args.stage_number,
          stage_name: args.stage_name,
          gameIds: args.gameIds,
        },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STAGES.ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STAGES.DETAIL(variables.stageId) });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.STAGES.ASSIGNED_GAME_IDS(variables.stageId),
      });
    },
  });
}
