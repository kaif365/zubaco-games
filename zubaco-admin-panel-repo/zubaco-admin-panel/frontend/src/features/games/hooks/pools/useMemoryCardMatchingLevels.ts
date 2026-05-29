import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import { useToast } from "@/providers/ToastProvider";
import {
  createMemoryCardMatchingLevel,
  deleteMemoryCardMatchingLevels,
  fetchMemoryCardMatchingLevels,
  updateMemoryCardMatchingLevel,
  uploadMemoryCardMatchingFiles,
  fetchMemoryCardMatchingStageConfig,
  upsertMemoryCardMatchingStageConfig,
  fetchMemoryCardMatchingLevelDetails,
} from "@/services/memory-card-matching-levels";
import type {
  CreateMemoryCardMatchingLevelPayload,
  MemoryCardMatchingLevelsParams,
  UpdateMemoryCardMatchingLevelPayload,
  UpsertMemoryCardMatchingStageConfigPayload,
} from "@/types/games/memory-card-matching";

export function useMemoryCardMatchingLevels(
  gameId: string,
  gameName: string,
  params: MemoryCardMatchingLevelsParams = {},
) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.GAMES.DETAIL(gameId),
      "memory-card-matching-levels",
      params,
    ],
    queryFn: () => fetchMemoryCardMatchingLevels(gameName, params),
    enabled: Boolean(gameId && gameName),
    staleTime: 0,
  });
}

export function useCreateMemoryCardMatchingLevel(
  gameId: string,
  gameName: string,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateMemoryCardMatchingLevelPayload) =>
      createMemoryCardMatchingLevel(gameName, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          ...QUERY_KEYS.GAMES.DETAIL(gameId),
          "memory-card-matching-levels",
        ],
      });
      toast({
        title: "Level created",
        description: "Memory Card Matching level saved successfully.",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create level",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateMemoryCardMatchingLevel(
  gameId: string,
  gameName: string,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: UpdateMemoryCardMatchingLevelPayload) =>
      updateMemoryCardMatchingLevel(gameName, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          ...QUERY_KEYS.GAMES.DETAIL(gameId),
          "memory-card-matching-levels",
        ],
      });
      toast({
        title: "Level updated",
        description: "Memory Card Matching level saved successfully.",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update level",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUploadMemoryCardMatchingFiles(gameName: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (files: File[]) => uploadMemoryCardMatchingFiles(gameName, files),
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteMemoryCardMatchingLevels(
  gameId: string,
  gameName: string,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (ids: string[]) => deleteMemoryCardMatchingLevels(gameName, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          ...QUERY_KEYS.GAMES.DETAIL(gameId),
          "memory-card-matching-levels",
        ],
      });
      toast({
        title: "Level deleted",
        description: "Selected level(s) deleted successfully.",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete level",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useMemoryCardMatchingStageConfig(
  gameId: string,
  gameName: string,
  stageId: string,
) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.GAMES.DETAIL(gameId),
      "memory-card-matching-stage-config",
      stageId,
    ],
    queryFn: () => fetchMemoryCardMatchingStageConfig(gameName, stageId),
    enabled: Boolean(gameId && gameName && stageId),
    staleTime: 0,
  });
}

export function useUpsertMemoryCardMatchingStageConfig(
  gameId: string,
  gameName: string,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: UpsertMemoryCardMatchingStageConfigPayload) =>
      upsertMemoryCardMatchingStageConfig(gameName, payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...QUERY_KEYS.GAMES.DETAIL(gameId),
          "memory-card-matching-stage-config",
          payload.stageId,
        ],
      });
      toast({
        title: "Configuration saved",
        description: "Memory Card Matching stage configuration saved successfully.",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save configuration",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useMemoryCardMatchingLevelDetails(
  gameId: string,
  gameName: string,
  levelId: string,
) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.GAMES.DETAIL(gameId),
      "memory-card-matching-level-details",
      levelId,
    ],
    queryFn: () => fetchMemoryCardMatchingLevelDetails(gameName, levelId),
    enabled: Boolean(gameId && gameName && levelId),
    staleTime: 0,
  });
}
