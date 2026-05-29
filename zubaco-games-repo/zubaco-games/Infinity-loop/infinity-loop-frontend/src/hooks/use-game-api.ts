"use client";

import gameServices, { type SaveGameLevelPayload } from "@/services/api/game";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const GAME_LEVELS_QUERY_KEY = ["game-levels"] as const;

export const useGameLevels = () => {
  return useQuery({
    queryKey: GAME_LEVELS_QUERY_KEY,
    queryFn: () => gameServices.getLevels(),
  });
};

export const useGameLevel = (id: string) => {
  return useQuery({
    queryKey: [...GAME_LEVELS_QUERY_KEY, id],
    queryFn: () => gameServices.getLevelById(id),
    enabled: Boolean(id),
  });
};

export const useCreateGameLevel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveGameLevelPayload) =>
      gameServices.createLevel(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GAME_LEVELS_QUERY_KEY });
    },
  });
};

export const useUpdateGameLevel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: SaveGameLevelPayload;
    }) => gameServices.updateLevel(id, payload),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: GAME_LEVELS_QUERY_KEY });
      await queryClient.invalidateQueries({
        queryKey: [...GAME_LEVELS_QUERY_KEY, variables.id],
      });
    },
  });
};

export const useDeleteGameLevel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gameServices.deleteLevel(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GAME_LEVELS_QUERY_KEY });
    },
  });
};
