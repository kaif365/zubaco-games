import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import {
  createInfinityBoard,
  deleteInfinityBoards,
  fetchInfinityBoards,
  type CreateInfinityBoardRequest,
} from "@/services/infinity-loop-boards";
import { fetchBoardDetailsByPath } from "@/services/pools";
import { useToast } from "@/providers/ToastProvider";

export function useInfinityBoards(
  gameId: string,
  gameName: string,
  params: { levelId?: string; search?: string; skip?: number; limit?: number },
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.GAMES.DETAIL(gameId), "infinity-boards", params],
    queryFn: () => fetchInfinityBoards(params, undefined, gameName),
    enabled: !!gameId,
    staleTime: 0,
  });
}

export function useCreateInfinityBoard(gameId: string, gameName: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateInfinityBoardRequest) =>
      createInfinityBoard(payload, undefined, gameName),
    onSuccess: (_created, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.GAMES.DETAIL(gameId), "infinity-boards"],
      });
      toast({
        title: "Success",
        description: `Board "${variables.name}" created successfully`,
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create board",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteInfinityBoards(gameId: string, gameName: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (ids: string[]) =>
      deleteInfinityBoards(ids, undefined, gameName),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.GAMES.DETAIL(gameId), "infinity-boards"],
      });
      toast({
        title: "Success",
        description: "Board(s) deleted successfully",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete board(s)",
        variant: "destructive",
      });
    },
  });
}

export function useInfinityBoardDetails(gameName: string) {
  return useMutation({
    mutationFn: (boardId: string) =>
      fetchBoardDetailsByPath(boardId, gameName),
  });
}
