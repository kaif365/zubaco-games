import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchInfinityLevels,
  createInfinityLevel,
  deleteInfinityLevels,
} from "@/services/pools";
import { QUERY_KEYS } from "@/config/query-keys";
import { useToast } from "@/providers/ToastProvider";

export function useInfinityLevels(
  gameId: string,
  gameName?: string,
  params: { name?: string; page?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.GAMES.DETAIL(gameId), "infinity-levels", params],
    queryFn: () => fetchInfinityLevels(gameId, params, undefined, gameName),
    enabled: !!gameId,
    staleTime: 0,
  });
}

export function useCreateInfinityLevel(gameId: string, gameName?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: { name: string }) =>
      createInfinityLevel(gameId, payload, undefined, gameName),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.GAMES.DETAIL(gameId), "infinity-levels"],
      });
      toast({
        title: "Success",
        description: "Level created successfully",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create level",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteInfinityLevels(gameId: string, gameName?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (ids: string[]) =>
      deleteInfinityLevels(gameId, ids, undefined, gameName),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.GAMES.DETAIL(gameId), "infinity-levels"],
      });
      toast({
        title: "Success",
        description: "Level(s) deleted successfully",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete level(s)",
        variant: "destructive",
      });
    },
  });
}
