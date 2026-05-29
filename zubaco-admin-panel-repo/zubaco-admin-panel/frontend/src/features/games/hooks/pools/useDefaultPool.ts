import { getGamePoolAdapter } from "@/config/pool-registry";
import { QUERY_KEYS } from "@/config/query-keys";
import { useToast } from "@/providers/ToastProvider";
import {
  createGameBoard,
  createMazeTemplate,
  deleteGameBoards,
  deleteMazeTemplatesSequentially,
  fetchBoardDetails,
  fetchBoardDetailsByPath,
  fetchDifficulties,
  fetchGameBoards,
  fetchLevels,
  fetchMazeTemplateDetails,
  fetchMazeTemplates,
  generateMazeTemplate,
  updateGameBoard,
} from "@/services/pools";
import type {
  MazeTemplateCreateRequest,
  MazeTemplateGenerateRequest,
} from "@/types/games/maze";
import type { BaseGameBoard } from "@/types/pool";
import { slugifyGameName } from "@/utils/slugify";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface FetchBoardsParams {
  levelId?: string;
  skip?: number;
  limit?: number;
  search?: string;
}

export function useBoards(
  gameId: string,
  gameName?: string,
  params: FetchBoardsParams = {},
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.GAMES.DETAIL(gameId), "boards", params],
    queryFn: async () => {
      const slug = slugifyGameName(gameName ?? "");
      const payload =
        slug === "maze-navigation"
          ? await fetchMazeTemplates(params, undefined, gameName)
          : await fetchGameBoards(gameId, params, undefined, gameName);

      const adapter = getGamePoolAdapter(gameName ?? "");
      const parsedBoards = payload.data.map((board) =>
        adapter.parseBoard(board),
      );
      const firstInvalid = parsedBoards.find((b) => !b.ok);
      if (firstInvalid && !firstInvalid.ok) {
        throw new Error(
          firstInvalid.message ||
            `Invalid boards response for game "${gameName ?? ""}".`,
        );
      }

      return {
        ...payload,
        data: parsedBoards
          .filter((b) => b.ok)
          .map((b) => b.value) as BaseGameBoard[],
      };
    },
    enabled: !!gameId,
    staleTime: 0,
  });
}

export function useGameLevels(
  gameName: string,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["levels", slugifyGameName(gameName)],
    queryFn: () => fetchLevels(gameName),
    staleTime: 5 * 60 * 1000,
    enabled: (options.enabled ?? true) && !!gameName,
  });
}

export function useDifficulties(
  gameName: string,
  params: {
    skip?: number;
    limit?: number;
    search?: string;
  } = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["difficulties", slugifyGameName(gameName), params],
    queryFn: () => fetchDifficulties(gameName, params),
    staleTime: 5 * 60 * 1000,
    enabled: (options.enabled ?? true) && !!gameName,
  });
}

export function useCreateBoard(gameId: string, gameName?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: unknown) => {
      const adapter = getGamePoolAdapter(gameName ?? "");
      const validatedPayload = adapter.parseCreatePayload(payload);
      if (!validatedPayload.ok) {
        throw new Error(
          validatedPayload.message ||
            `Invalid create payload for game "${gameName ?? ""}".`,
        );
      }
      const slug = slugifyGameName(gameName ?? "");
      if (slug === "maze-navigation") {
        return createMazeTemplate(
          validatedPayload.value as MazeTemplateCreateRequest,
          undefined,
          gameName,
        );
      }
      return createGameBoard<BaseGameBoard, unknown>(
        gameId,
        validatedPayload.value,
        undefined,
        gameName,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.GAMES.DETAIL(gameId), "boards"],
      });
      toast({
        title: "Success",
        description: "Board created successfully",
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

export function useDeleteBoards(gameId: string, gameName?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (boardIds: string[]) => {
      const slug = slugifyGameName(gameName ?? "");
      if (slug === "maze-navigation") {
        return deleteMazeTemplatesSequentially(boardIds, undefined, gameName);
      }
      return deleteGameBoards(gameId, boardIds, undefined, gameName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.GAMES.DETAIL(gameId), "boards"],
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

export function useBoardDetails(gameName: string) {
  return useMutation({
    mutationFn: (boardId: string) => {
      const slug = slugifyGameName(gameName);
      if (slug === "maze-navigation") {
        return fetchMazeTemplateDetails(boardId, gameName);
      }
      if (slug === "block-fill") {
        return fetchBoardDetailsByPath(boardId, gameName);
      }
      return fetchBoardDetails(boardId, gameName);
    },
  });
}

export function useGenerateMaze(gameName: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: MazeTemplateGenerateRequest) =>
      generateMazeTemplate(payload, undefined, gameName),
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate maze",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateBoard(gameId: string, gameName?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: unknown) => {
      return updateGameBoard(gameId, payload, undefined, gameName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.GAMES.DETAIL(gameId), "boards"],
      });
      toast({
        title: "Success",
        description: "Board updated successfully",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update board",
        variant: "destructive",
      });
    },
  });
}
