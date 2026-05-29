import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/query-keys';
import {
  fetchStageGameConfig,
  updateStageGameConfig,
} from '@/services/stage-game-configs';
import type { GameConfig } from '@/types/game-config';
import {
  isSlidingPuzzleGameConfig,
  isMemoryCardMatchingGameConfig,
  isBlockFillGameConfig,
  isArrowGameConfig,
  isSudokuGameConfig,
  isSpotTheDifferenceGameConfig,
  type SlidingPuzzleStageConfigLevel,
  type ArrowStageConfigLevel,
  type SudokuStageConfigLevel,
} from '@/types/game-config';
import { useUpdateGameByIdMutation } from '@/lib/react-query/games';
import type { UpdateGameRequest } from '@/lib/api/endpoints/games';
import { slugifyGameName } from '@/utils/slugify';

export function useStageGameConfig(
  stageId: string,
  gameName?: string,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: QUERY_KEYS.STAGE_GAME_CONFIGS.DETAIL(stageId, gameName),
    queryFn: () => fetchStageGameConfig(stageId, gameName!),
    enabled: (options.enabled ?? true) && !!stageId && !!gameName,
  });
}

export function useUpdateStageGameConfig(gameName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: GameConfig) => updateStageGameConfig(config, gameName),
    onSuccess: (updated) => {
      if (!updated) return;
      return queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.STAGE_GAME_CONFIGS.DETAIL(
          updated.stageId,
          gameName,
        ),
      });
    },
  });
}

function toGameUpdatePayload(
  config: GameConfig,
  gameName: string,
): UpdateGameRequest {
  const slug = slugifyGameName(gameName);

  if ('minSequence' in config) {
    return {
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      cellCount: config.cellCount,
      minSequence: config.minSequence,
      maxSequence: config.maxSequence,
      enableDemo: config.enableDemo,
      demoMinSequence: config.demoMinSequence,
      demoMaxSequence: config.demoMaxSequence,
      flashDelay: config.flashDelay,
      levelDelay: config.levelDelay,
      bonusTimeRatio: config.bonusTimeRatio,
      scorePerClick: config.scorePerClick,
      wrongMoveHandling: config.wrongMoveHandling,
    };
  }

  if (isMemoryCardMatchingGameConfig(config)) {
    return {
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      enableDemo: config.enableDemo,
      level_configs: config.levels
        .filter((l) => l.boardCount > 0)
        .map((level, index) => ({
          level_id: level.difficultyId,
          board_count: level.boardCount,
          sort_order: index + 1,
          is_demo: false,
        })),
    };
  }

  if (isSlidingPuzzleGameConfig(config)) {
    return {
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      enableDemo: config.enableDemo,
      gameConfig: {
        enableNumbers: config.enableNumbers,
      },
      level_configs: config.levels
        .filter((l) => l.boardCount > 0)
        .map((level: SlidingPuzzleStageConfigLevel, index: number) => ({
          level_id: level.levelId,
          board_count: level.boardCount,
          display_time: level.displayTime,
          sort_order: index + 1,
          is_demo: false,
        })),
    };
  }

  if (isSudokuGameConfig(config)) {
    const levelConfigs = config.levels
      .filter((l) => l.boardCount > 0)
      .map((level: SudokuStageConfigLevel, index: number) => ({
        level_id: level.levelId,
        board_count: level.boardCount,
        sort_order: index + 1,
        is_demo: false,
      }));
    const demoConfigs = config.enableDemo
      ? config.demoLevels
          .filter((l) => l.boardCount > 0)
          .map((level: SudokuStageConfigLevel, index: number) => ({
            level_id: level.levelId,
            board_count: level.boardCount,
            sort_order: index + 1,
            is_demo: true,
          }))
      : [];

    return {
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      enableDemo: config.enableDemo,
      level_configs: [...levelConfigs, ...demoConfigs],
    };
  }

  if (isSpotTheDifferenceGameConfig(config)) {
    const levelConfigs = config.levels
      .filter((l) => l.boardCount > 0)
      .map((level, index) => ({
        level_id: level.levelId,
        board_count: level.boardCount,
        sort_order: index + 1,
        is_demo: false,
      }));
    const demoConfigs = config.demoLevels
      .filter((l) => l.boardCount > 0)
      .map((level, index) => ({
        level_id: level.levelId,
        board_count: level.boardCount,
        sort_order: index + 1,
        is_demo: true,
      }));
    return {
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      hintCount: config.hintCount,
      enableDemo: config.enableDemo,
      level_configs: [...levelConfigs, ...demoConfigs],
    };
  }

  if (isBlockFillGameConfig(config)) {
    const levelConfigs = config.levels.map(
      (level: ArrowStageConfigLevel, index: number) => ({
        level_id: level.levelId,
        board_count: level.boardCount,
        sort_order: index + 1,
        is_demo: false,
      }),
    );
    const demoConfigs = config.enableDemo
      ? config.demoLevels
          .filter((l) => l.boardCount > 0)
          .map((level: ArrowStageConfigLevel, index: number) => ({
            level_id: level.levelId,
            board_count: level.boardCount,
            sort_order: index + 1,
            is_demo: true,
          }))
      : [];
    return {
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      enableDemo: config.enableDemo,
      level_configs: [...levelConfigs, ...demoConfigs],
    };
  }

  const isArrowLike = slug === "arrows" || slug === "block-fill";
  const includeDemoLevels =
    'demoLevels' in config && Boolean(config.enableDemo) && isArrowLike;
  const demoLevelsToSend =
    'demoLevels' in config
      ? config.demoLevels.filter((level) => level.boardCount > 0)
      : [];

  return {
    stageId: config.stageId,
    timeLimit: config.timeLimit,
    enableDemo: isArrowLike
      ? (isArrowGameConfig(config) || isBlockFillGameConfig(config))
        ? config.enableDemo
        : undefined
      : undefined,
    level_configs:
      'demoLevels' in config
        ? [
            ...config.levels.map(
              (level: ArrowStageConfigLevel, index: number) => ({
                level_id: level.levelId,
                board_count: level.boardCount,
                display_time: level.displayTime,
                sort_order: index + 1,
                is_demo: false,
              }),
            ),
            ...(includeDemoLevels
              ? demoLevelsToSend.map(
                  (level: ArrowStageConfigLevel, index: number) => ({
                    level_id: level.levelId,
                    board_count: level.boardCount,
                    display_time: level.displayTime,
                    sort_order: index + 1,
                    is_demo: true,
                  }),
                )
              : []),
          ]
        : config.levels.map((level: ArrowStageConfigLevel, index: number) => ({
            level_id: level.levelId,
            board_count: level.boardCount,
            display_time: level.displayTime,
            sort_order: index + 1,
            is_demo: false,
          })),
  };
}

export function useUpdateGameEntityConfig(gameId: string, gameName: string) {
  const mutation = useUpdateGameByIdMutation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: GameConfig) =>
      mutation.mutateAsync({
        id: gameId,
        payload: toGameUpdatePayload(config, gameName),
        stageId: config.stageId,
      }),
    onSuccess: (data, config) => {
      return queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.STAGE_GAME_CONFIGS.DETAIL(config.stageId, gameName),
      });
    },
  });
}

export function useSaveGameConfig(
  gameId: string | undefined,
  gameName: string,
) {
  const stageMutation = useUpdateStageGameConfig(gameName);
  const adminMutation = useUpdateGameEntityConfig(gameId ?? '', gameName);

  return {
    mutateAsync: (config: GameConfig) =>
      gameId
        ? adminMutation.mutateAsync(config)
        : stageMutation.mutateAsync(config),
  };
}
