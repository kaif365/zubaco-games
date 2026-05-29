import { ArrowGameConfig } from "@/features/games/components/configs/ArrowGameConfig";
import { BlockFillGameConfig } from "@/features/games/components/configs/BlockFillGameConfig";
import { InfinityGameConfig } from "@/features/games/components/configs/InfinityGameConfig";
import { MazeGameConfig } from "@/features/games/components/configs/MazeGameConfig";
import { MemoryCardMatchingGameConfig } from "@/features/games/components/configs/MemoryCardMatchingGameConfig";
import { SequenceGameConfig } from "@/features/games/components/configs/SequenceGameConfig";
import { SlidingPuzzleGameConfig } from "@/features/games/components/configs/SlidingPuzzleGameConfig";
import { SudokuGameConfig } from "@/features/games/components/configs/SudokuGameConfig";
// Config components
import { SpotTheDifferenceGameConfig } from "@/features/games/components/configs/SpotTheDifferenceGameConfig";
import { DefaultPoolView } from "@/features/games/components/pools/DefaultPoolView";
import { InfinityLoopPoolView } from "@/features/games/components/pools/InfinityLoopPoolView";
import { MemoryCardMatchingLevelsView } from "@/features/games/components/pools/MemoryCardMatchingLevelsView";
// Pool views
import { SpotTheDifferencePoolView } from "@/features/games/components/pools/SpotTheDifferencePoolView";
import { getArrowsColumns } from "@/features/games/config/pool-columns/arrows";
import { getBlockFillColumns } from "@/features/games/config/pool-columns/block-fill";
// import { getDefaultBoardsColumns } from '@/features/games/config/pool-columns/default-boards';
import { WRONG_MOVE_HANDLING } from "@/constants/wrong-move-handling";
import ARROW_SAMPLE_JSON from "@/features/games/assets/arrows.json";
import BLOCK_SAMPLE_JSON from "@/features/games/assets/blockFill.json";
import { getInfinityColumns } from "@/features/games/config/pool-columns/infinity";
import { getMazeColumns } from "@/features/games/config/pool-columns/maze";
import { getSlidingPuzzleColumns } from "@/features/games/config/pool-columns/sliding-puzzle";
import { getSudokuColumns } from "@/features/games/config/pool-columns/sudoku";
import type { QueryParams } from "@/lib/api/client";
import type {
  ArrowGameConfig as ArrowConfig,
  ArrowStageConfigLevel,
  BlockFillGameConfig as BlockFillConfig,
  GameConfig,
  InfinityGameConfig as InfinityConfig,
  MazeGameConfig as MazeConfig,
  MazeStageConfigLevel,
  MemoryCardMatchingGameConfig as MemoryCardMatchingConfig,
  SequenceGameConfig as SequenceConfig,
  SlidingPuzzleGameConfig as SlidingPuzzleConfig,
  SlidingPuzzleStageConfigLevel,
  SpotTheDifferenceGameConfig as SpotTheDifferenceConfig,
  SpotTheDifferenceStageConfigLevel,
  SudokuGameConfig as SudokuConfig,
  SudokuStageConfigLevel,
} from "@/types/game-config";
import {
  isArrowGameConfig,
  isBlockFillGameConfig,
  isInfinityGameConfig,
  isMazeGameConfig,
  isMemoryCardMatchingGameConfig,
  isSequenceGameConfig,
  isSlidingPuzzleGameConfig,
  isSpotTheDifferenceGameConfig,
  isSudokuGameConfig,
} from "@/types/game-config";
import type { JsonValue } from "@/types/pool";
import { slugifyGameName } from "@/utils/slugify";
import React from "react";

/**
 * Metadata for a specific game, defining its API and UI components.
 */
export interface StageConfigAdapter<TConfig = unknown> {
  parse: (raw: unknown) => TConfig | null;
  serialize: (config: TConfig) => unknown;
  listQuery?: (stageId: string) => QueryParams;
  applyDefaults?: (config: TConfig) => TConfig;
  defaults?: (stageId: string) => TConfig;
}

export interface StageConfigComponentProps<TConfig = unknown> {
  /**
   * Admin game id (Games → Game Detail). Not available in stage-scoped flows.
   */
  gameId?: string;
  gameName: string;
  stageId: string;
  config: TConfig;
  configDataUpdatedAt: number;
}

export interface GameMetadata<TConfig = unknown, TPoolColumn = unknown> {
  name: string;
  apiBaseUrl?: string;
  tokenResolver?: (token?: string) => string | undefined;
  stageConfig?: StageConfigAdapter<TConfig>;
  configComponent?: React.ComponentType<StageConfigComponentProps<TConfig>>;
  /**
   * Use this stage id whenever the game service expects one shared config id,
   * regardless of the admin route stage.
   */
  fixedStageConfigId?: string;
  /**
   * Fallback stage id for standalone game config pages where there is no
   * stage id in the route.
   */
  fallbackStageConfigId?: string;
  /**
   * When true, the config UI can render even when there is no saved config yet
   * (e.g., it supports "Create configuration" flows).
   */
  allowConfigRenderWithoutExisting?: boolean;
  poolComponent?: React.ComponentType<{ gameId: string; gameName: string }>;
  /** Label for the Pool tab on the game detail page. Defaults to "Pool". */
  poolTabLabel?: string;
  /** Label for the Pool tab on the game detail page. Defaults to "Pool". */
  poolColumns?: TPoolColumn;
  /**
   * Optional sample JSON that admins can download from the default pool view
   * to understand the expected payload format.
   */
  poolSampleJson?: JsonValue;
  /**
   * Optional custom filename for `poolSampleJson` downloads.
   */
  poolSampleJsonFileName?: string;
}

/**
 * Helper function to define game metadata with specific types.
 * Returns a broadly-typed GameMetadata object for use in the GAME_REGISTRY.
 */
export function defineGame<TConfig = unknown, TPoolColumn = unknown>(
  metadata: GameMetadata<TConfig, TPoolColumn>,
): GameMetadata<unknown, unknown> {
  return metadata as unknown as GameMetadata<unknown, unknown>;
}

const DEFAULT_SEQUENCE_CELL_COUNT = 4;

const DEFAULT_SEQUENCE_CONFIG = {
  cellCount: DEFAULT_SEQUENCE_CELL_COUNT,
  timeLimit: 60,
  minSequence: 3,
  maxSequence: 8,
  enableDemo: false,
  demoMinSequence: 3,
  demoMaxSequence: 5,
  flashDelay: 300,
  levelDelay: 1,
  bonusTimeRatio: 2,
  scorePerClick: 10,
  wrongMoveHandling: WRONG_MOVE_HANDLING.NEXT_SEQUENCE,
} satisfies Omit<SequenceConfig, "id" | "stageId" | "createdAt">;

// TODO: REMOVE THIS ONCE ARROWS GAME SERVER AUTH IS FIXED
// const ARROWS_TEMP_TOKEN = process.env.NEXT_PUBLIC_ARROWS_TEMP_TOKEN;
// const INFINITY_TEMP_TOKEN = process.env.NEXT_PUBLIC_INFINITYLOOP_TEMP_TOKEN;
// const BLOCK_TEMP_TOKEN = process.env.NEXT_PUBLIC_BLOCKFILL_TEMP_TOKEN;
// const SUDOKU_TEMP_TOKEN = process.env.NEXT_PUBLIC_SUDOKU_TEMP_TOKEN;
// const MAZE_TEMP_TOKEN = process.env.NEXT_PUBLIC_MAZE_TEMP_TOKEN;
const MCM_API_BASE_URL = process.env.NEXT_PUBLIC_MCM_API_BASE_URL;
// const SPOT_THE_DIFFERENCE_TEMP_TOKEN = process.env.NEXT_PUBLIC_SPOT_THE_DIFFERENCE_TEMP_TOKEN;
interface RawInfinityGameConfig {
  id: string;
  stageId: string;
  timeLimit: number;
  createdAt: string;
  levels: RawInfinityLevel[];
}

interface RawInfinityLevel {
  id: string;
  stageConfigId?: string;
  levelId?: string;
  boardCount: number;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  level: { id: string; name: string };
}

interface RawMemoryCardMatchingLevel {
  id: string;
  difficultyId?: string;
  difficulty_id?: string;
  boardCount?: number;
  board_count?: number;
  maxScore?: number;
  max_score?: number;
}

interface RawMemoryCardMatchingDemoLevel {
  difficultyId?: string;
  difficulty_id?: string;
  boardCount?: number;
  board_count?: number;
}

interface RawMemoryCardMatchingGameConfig {
  id?: string;
  stageId?: string;
  stage_id?: string;
  timeLimit?: number;
  time_limit?: number;
  enableDemo?: boolean;
  enable_demo?: boolean;
  levels?: RawMemoryCardMatchingLevel[];
  demoLevels?: RawMemoryCardMatchingDemoLevel[];
  demo_levels?: RawMemoryCardMatchingDemoLevel[];
  createdAt?: string;
  created_at?: string;
}

function parseArrowStageConfig(raw: unknown): ArrowConfig | null {
  if (!raw || typeof raw !== "object") return null;

  const arrowRaw = raw as Record<string, unknown>;
  const rawLevels = (arrowRaw.levels ??
    arrowRaw.level_configs ??
    []) as unknown[];
  const rawDemoLevels = (arrowRaw.demoLevels ??
    arrowRaw.demo_levels ??
    []) as unknown[];

  return {
    id: arrowRaw.id as string,
    stageId: (arrowRaw.stageId ?? arrowRaw.stage_id) as string,
    timeLimit: (arrowRaw.timeLimit ?? arrowRaw.time_limit) as number,
    maxTimeBonus: (arrowRaw.maxTimeBonus ?? arrowRaw.max_time_bonus ?? 0) as number,
    enableDemo: (arrowRaw.enableDemo ??
      arrowRaw.enable_demo ??
      false) as boolean,
    createdAt: (arrowRaw.createdAt ?? arrowRaw.created_at) as string,
    levels: rawLevels.map((lvl) => {
      const level = lvl as Record<string, unknown>;
      const nestedLevel = level.level as Record<string, unknown> | undefined;
      return {
        levelId: (nestedLevel?.id ??
          level.levelId ??
          level.level_id ??
          "") as string,
        boardCount: (level.boardCount ?? level.board_count ?? 0) as number,
        maxScore: (level.maxScore ?? level.max_score ?? 0) as number,
      };
    }),
    demoLevels: rawDemoLevels.map((lvl) => {
      const level = lvl as Record<string, unknown>;
      const nestedLevel = level.level as Record<string, unknown> | undefined;
      return {
        levelId: (nestedLevel?.id ??
          level.levelId ??
          level.level_id ??
          "") as string,
        boardCount: (level.boardCount ?? level.board_count ?? 0) as number,
        maxScore: (level.maxScore ?? level.max_score ?? 0) as number,
      };
    }),
  };
}

function parseBlockFillStageConfig(raw: unknown): BlockFillConfig | null {
  if (!raw || typeof raw !== "object") return null;

  const arrowRaw = raw as Record<string, unknown>;
  const rawLevels = (arrowRaw.levels ??
    arrowRaw.level_configs ??
    []) as unknown[];

  return {
    id: arrowRaw.id as string,
    stageId: (arrowRaw.stageId ?? arrowRaw.stage_id) as string,
    timeLimit: (arrowRaw.timeLimit ?? arrowRaw.time_limit) as number,
    maxTimeBonus: (arrowRaw.maxTimeBonus ?? arrowRaw.max_time_bonus ?? 0) as number,
    enableDemo: (arrowRaw.enableDemo ??
      arrowRaw.enable_demo ??
      false) as boolean,
    createdAt: (arrowRaw.createdAt ?? arrowRaw.created_at) as string,
    __kind: "block-fill",
    levels: rawLevels.map((lvl) => {
      const level = lvl as Record<string, unknown>;
      const nestedLevel = level.level as Record<string, unknown> | undefined;
      return {
        levelId: (nestedLevel?.id ??
          level.levelId ??
          level.level_id ??
          "") as string,
        boardCount: (level.boardCount ?? level.board_count ?? 0) as number,
        maxScore: (level.maxScore ?? level.max_score ?? 0) as number,
      };
    }),
    demoLevels: [],
  };
}

function parseMazeStageConfig(raw: unknown): MazeConfig | null {
  if (!raw || typeof raw !== "object") return null;

  const rawObj = raw as Record<string, unknown>;
  const rawLevels = (rawObj.levels ?? rawObj.level_configs ?? []) as unknown[];
  const rawDemoLevels = (rawObj.demoLevels ??
    rawObj.demo_levels ??
    []) as unknown[];

  const parsedLevels: MazeStageConfigLevel[] = [];
  const parsedDemoLevels: MazeStageConfigLevel[] = [];

  for (const lvl of rawLevels) {
    const level = lvl as Record<string, unknown>;
    const nestedLevel = level.level as Record<string, unknown> | undefined;
    const levelId = (nestedLevel?.id ??
      level.levelId ??
      level.level_id ??
      "") as string;
    const boardCount = (level.boardCount ?? level.board_count ?? 0) as number;
    const maxScore = (level.maxScore ?? level.max_score ?? 0) as number;
    const name = (nestedLevel?.name ?? level.name ?? "") as string;

    const isDemo =
      name.trim().toLowerCase() === "demo" ||
      name.trim().toLowerCase().startsWith("demo ");

    if (isDemo) {
      parsedDemoLevels.push({ levelId, boardCount, maxScore });
    } else {
      parsedLevels.push({ levelId, boardCount, maxScore });
    }
  }

  // If backend provided demoLevels explicitly, overwrite the demo levels
  if (rawDemoLevels.length > 0) {
    parsedDemoLevels.length = 0;
    for (const lvl of rawDemoLevels) {
      const level = lvl as Record<string, unknown>;
      const nestedLevel = level.level as Record<string, unknown> | undefined;
      const levelId = (nestedLevel?.id ??
        level.levelId ??
        level.level_id ??
        "") as string;
      const boardCount = (level.boardCount ?? level.board_count ?? 0) as number;
      const maxScore = (level.maxScore ?? level.max_score ?? 0) as number;
      parsedDemoLevels.push({ levelId, boardCount, maxScore });
    }
  }

  return {
    id: rawObj.id as string,
    stageId: (rawObj.stageId ?? rawObj.stage_id) as string,
    timeLimit: (rawObj.timeLimit ?? rawObj.time_limit) as number,
    maxTimeBonus: (rawObj.maxTimeBonus ?? rawObj.max_time_bonus ?? 0) as number,
    enableDemo: (rawObj.enableDemo ?? rawObj.enable_demo ?? false) as boolean,
    createdAt: (rawObj.createdAt ?? rawObj.created_at) as string,
    __kind: "maze",
    levels: parsedLevels,
    demoLevels: parsedDemoLevels,
  };
}

function parseSpotTheDifferenceStageConfig(
  raw: unknown,
): SpotTheDifferenceConfig | null {
  if (!raw || typeof raw !== "object") return null;

  const rawObj = raw as Record<string, unknown>;
  const rawLevels = (rawObj.levels ?? rawObj.level_configs ?? []) as unknown[];
  const rawDemoLevels = (rawObj.demoLevels ??
    rawObj.demo_levels ??
    []) as unknown[];

  return {
    id: rawObj.id as string,
    stageId: (rawObj.stageId ?? rawObj.stage_id) as string,
    timeLimit: (rawObj.timeLimit ?? rawObj.time_limit ?? 300) as number,
    maxTimeBonus: (rawObj.maxTimeBonus ?? rawObj.max_time_bonus ?? 0) as number,
    hintCount: (rawObj.hintCount ?? rawObj.hint_count ?? 2) as number,
    enableDemo: (rawObj.enableDemo ?? rawObj.enable_demo ?? false) as boolean,
    createdAt: (rawObj.createdAt ?? rawObj.created_at) as string,
    __kind: "spot-the-difference",
    levels: rawLevels
      .map((lvl) => {
        const level = lvl as Record<string, unknown>;
        const nestedLevel = level.level as Record<string, unknown> | undefined;
        return {
          levelId: (nestedLevel?.id ??
            level.levelId ??
            level.level_id ??
            "") as string,
          boardCount: (level.boardCount ?? level.board_count ?? 0) as number,
          maxScore: (level.maxScore ?? level.max_score ?? 0) as number,
        };
      })
      .filter((level) => Boolean(level.levelId)),
    demoLevels: rawDemoLevels
      .map((lvl) => {
        const level = lvl as Record<string, unknown>;
        const nestedLevel = level.level as Record<string, unknown> | undefined;
        return {
          levelId: (nestedLevel?.id ??
            level.levelId ??
            level.level_id ??
            "") as string,
          boardCount: (level.boardCount ?? level.board_count ?? 0) as number,
          maxScore: (level.maxScore ?? level.max_score ?? 0) as number,
        };
      })
      .filter((level) => Boolean(level.levelId)),
  };
}

function parseSlidingPuzzleStageConfig(
  raw: unknown,
): SlidingPuzzleConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const rawLevels = (r.levels ?? r.level_configs ?? []) as unknown[];
  const rawDemoLevels = (r.demoLevels ?? r.demo_levels ?? []) as unknown[];

  const gameConfig = r.gameConfig ?? r.game_config;
  const gameConfigRecord =
    typeof gameConfig === "object" && gameConfig !== null
      ? (gameConfig as Record<string, unknown>)
      : null;

  return {
    id: r.id as string,
    stageId: (r.stageId ?? r.stage_id) as string,
    timeLimit: (r.timeLimit ?? r.time_limit) as number,
    maxTimeBonus: (r.maxTimeBonus ?? r.max_time_bonus ?? 0) as number,
    enableDemo: (r.enableDemo ?? r.enable_demo ?? false) as boolean,
    enableNumbers: (gameConfigRecord?.enableNumbers ??
      gameConfigRecord?.enable_numbers ??
      r.enableNumbers ??
      r.enable_numbers ??
      true) as boolean,
    createdAt: (r.createdAt ?? r.created_at) as string,
    __kind: "sliding-puzzle",
    levels: rawLevels
      .map((lvl) => {
        const level = lvl as Record<string, unknown>;
        const nestedLevel = level.level as Record<string, unknown> | undefined;
        return {
          levelId: (nestedLevel?.id ??
            level.levelId ??
            level.level_id ??
            "") as string,
          boardCount: (level.boardCount ?? level.board_count ?? 0) as number,
          displayTime: (level.displayTime ?? level.display_time ?? 0) as number,
          maxScore: (level.maxScore ?? level.max_score ?? 0) as number,
        };
      })
      .filter((level) => Boolean(level.levelId)),
    demoLevels: rawDemoLevels
      .map((lvl) => {
        const level = lvl as Record<string, unknown>;
        const nestedLevel = level.level as Record<string, unknown> | undefined;
        return {
          levelId: (nestedLevel?.id ??
            level.levelId ??
            level.level_id ??
            "") as string,
          boardCount: (level.boardCount ?? level.board_count ?? 0) as number,
          displayTime: (level.displayTime ?? level.display_time ?? 0) as number,
          maxScore: (level.maxScore ?? level.max_score ?? 0) as number,
        };
      })
      .filter((level) => Boolean(level.levelId)),
  };
}

function parseSudokuStageConfig(raw: unknown): SudokuConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const rawLevels = (r.levels ?? r.level_configs ?? []) as unknown[];
  const rawDemoLevels = (r.demoLevels ?? r.demo_levels ?? []) as unknown[];

  return {
    id: r.id as string,
    stageId: (r.stageId ?? r.stage_id) as string,
    timeLimit: (r.timeLimit ?? r.time_limit) as number,
    maxTimeBonus: (r.maxTimeBonus ?? r.max_time_bonus ?? 0) as number,
    enableDemo: (r.enableDemo ?? r.enable_demo ?? false) as boolean,
    createdAt: (r.createdAt ?? r.created_at) as string,
    __kind: "sudoku",
    levels: rawLevels
      .map((lvl) => {
        const level = lvl as Record<string, unknown>;
        const nestedLevel = level.level as Record<string, unknown> | undefined;
        return {
          levelId: (nestedLevel?.id ??
            level.levelId ??
            level.level_id ??
            "") as string,
          boardCount: (level.boardCount ?? level.board_count ?? 0) as number,
          maxScore: (level.maxScore ?? level.max_score ?? 0) as number,
        };
      })
      .filter((level) => Boolean(level.levelId)),
    demoLevels: rawDemoLevels
      .map((lvl) => {
        const level = lvl as Record<string, unknown>;
        const nestedLevel = level.level as Record<string, unknown> | undefined;
        return {
          levelId: (nestedLevel?.id ??
            level.levelId ??
            level.level_id ??
            "") as string,
          boardCount: (level.boardCount ?? level.board_count ?? 0) as number,
          maxScore: (level.maxScore ?? level.max_score ?? 0) as number,
        };
      })
      .filter((level) => Boolean(level.levelId)),
  };
}

function parseInfinityStageConfig(raw: unknown): InfinityConfig | null {
  if (!raw) return null;
  const infinityRaw = raw as RawInfinityGameConfig;
  const rawObj = raw as Record<string, unknown>;
  return {
    id: infinityRaw.id,
    stageId: infinityRaw.stageId,
    timeLimit: infinityRaw.timeLimit,
    maxTimeBonus: (rawObj.maxTimeBonus ?? rawObj.max_time_bonus ?? 0) as number,
    createdAt: infinityRaw.createdAt,
    levels: (infinityRaw.levels ?? [])
      .map((level) => {
        const rawLevel = level as unknown as Record<string, unknown>;
        return {
          levelId: level.level?.id ?? level.levelId ?? "",
          boardCount: level.boardCount,
          maxScore: (rawLevel.maxScore ?? rawLevel.max_score ?? 0) as number,
        };
      })
      .filter((level) => Boolean(level.levelId)),
  };
}

// function parseMemoryCardMatchingStageConfig(
//   raw: unknown,
// ): MemoryCardMatchingConfig | null {
//   if (!raw || typeof raw !== "object") return null;
//   const mcmRaw = raw as RawMemoryCardMatchingGameConfig;

//   return {
//     id: mcmRaw.id ?? "",
//     stageId: mcmRaw.stageId ?? "default",
//     levelCount: mcmRaw.levelCount ?? 3,
//     timeLimit: mcmRaw.gameTimeLimitSeconds ?? mcmRaw.timeLimit ?? 120,
//     enableDemo: mcmRaw.enableDemo ?? false,
//     createdAt: mcmRaw.createdAt ?? mcmRaw.created_at ?? "",
//     __kind: "memory-card-matching",
//   };
// }

function parseMemoryCardMatchingStageConfig(
  raw: unknown,
): MemoryCardMatchingConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const mcmRaw = raw as RawMemoryCardMatchingGameConfig;

  const mcmRawObj = raw as Record<string, unknown>;
  return {
    id: mcmRaw.id ?? "",
    stageId: mcmRaw.stageId ?? mcmRaw.stage_id ?? "default",
    timeLimit: mcmRaw.timeLimit ?? mcmRaw.time_limit ?? 120,
    maxTimeBonus: (mcmRawObj.maxTimeBonus ?? mcmRawObj.max_time_bonus ?? 0) as number,
    enableDemo: mcmRaw.enableDemo ?? mcmRaw.enable_demo ?? false,
    levels: (mcmRaw.levels ?? []).map((l: RawMemoryCardMatchingLevel) => ({
      id: l.id,
      difficultyId: l.difficultyId ?? l.difficulty_id ?? "",
      boardCount: l.boardCount ?? l.board_count ?? 0,
      maxScore: l.maxScore ?? l.max_score ?? 0,
    })),
    demoLevels: (mcmRaw.demoLevels ?? mcmRaw.demo_levels ?? []).map(
      (l: RawMemoryCardMatchingDemoLevel) => ({
        difficultyId: l.difficultyId ?? l.difficulty_id ?? "",
        boardCount: l.boardCount ?? l.board_count ?? 0,
      }),
    ),
    createdAt: mcmRaw.createdAt ?? mcmRaw.created_at ?? "",
    __kind: "memory-card-matching",
  };
}

function serializeStageConfig(config: GameConfig): unknown {
  if (isSlidingPuzzleGameConfig(config)) {
    return {
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      maxTimeBonus: config.maxTimeBonus ?? 0,
      enableDemo: config.enableDemo,
      enableNumbers: config.enableNumbers ?? true,
      levels: (config.levels ?? [])
        .filter((level: SlidingPuzzleStageConfigLevel) => level.boardCount > 0)
        .map((level: SlidingPuzzleStageConfigLevel) => ({
          levelId: level.levelId,
          boardCount: level.boardCount,
          displayTime: level.displayTime,
          maxScore: level.maxScore ?? 0,
        })),
      demoLevels: config.enableDemo
        ? (config.demoLevels ?? [])
            .filter(
              (level: SlidingPuzzleStageConfigLevel) => level.boardCount > 0,
            )
            .map((level: SlidingPuzzleStageConfigLevel) => ({
              levelId: level.levelId,
              boardCount: level.boardCount,
              displayTime: level.displayTime,
              maxScore: level.maxScore ?? 0,
            }))
        : [],
    };
  }

  if (isMemoryCardMatchingGameConfig(config)) {
    return {
      ...(config.id ? { id: config.id } : {}),
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      maxTimeBonus: config.maxTimeBonus ?? 0,
      enableDemo: config.enableDemo,
      levels: (config.levels ?? [])
        .filter((l) => l.boardCount > 0)
        .map((l) => ({
          ...(l.id ? { id: l.id } : {}),
          difficultyId: l.difficultyId,
          boardCount: l.boardCount,
          maxScore: l.maxScore ?? 0,
        })),
      demoLevels: config.enableDemo
        ? (config.demoLevels ?? [])
            .filter((l) => l.boardCount > 0)
            .map((l) => ({
              difficultyId: l.difficultyId,
              boardCount: l.boardCount,
            }))
        : [],
    };
  }

  if (isSudokuGameConfig(config)) {
    return {
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      maxTimeBonus: config.maxTimeBonus ?? 0,
      enableDemo: config.enableDemo,
      levels: (config.levels ?? [])
        .filter((level: SudokuStageConfigLevel) => level.boardCount > 0)
        .map((level: SudokuStageConfigLevel) => ({
          levelId: level.levelId,
          boardCount: level.boardCount,
          maxScore: level.maxScore ?? 0,
        })),
      demoLevels: config.enableDemo
        ? (config.demoLevels ?? [])
            .filter((level: SudokuStageConfigLevel) => level.boardCount > 0)
            .map((level: SudokuStageConfigLevel) => ({
              levelId: level.levelId,
              boardCount: level.boardCount,
              maxScore: level.maxScore ?? 0,
            }))
        : [],
    };
  }

  if (isBlockFillGameConfig(config)) {
    return {
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      maxTimeBonus: config.maxTimeBonus ?? 0,
      enableDemo: config.enableDemo,
      levels: config.levels
        .filter((level: ArrowStageConfigLevel) => level.boardCount > 0)
        .map((level: ArrowStageConfigLevel) => ({
          levelId: level.levelId,
          boardCount: level.boardCount,
          maxScore: level.maxScore ?? 0,
        })),
      demoLevels: config.enableDemo
        ? config.demoLevels
            .filter((level: ArrowStageConfigLevel) => level.boardCount > 0)
            .map((level: ArrowStageConfigLevel) => ({
              levelId: level.levelId,
              boardCount: level.boardCount,
            }))
        : [],
    };
  }

  if (isArrowGameConfig(config)) {
    return {
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      maxTimeBonus: config.maxTimeBonus ?? 0,
      enableDemo: config.enableDemo,
      levels: config.levels
        .filter((level: ArrowStageConfigLevel) => level.boardCount > 0)
        .map((level: ArrowStageConfigLevel) => ({
          levelId: level.levelId,
          boardCount: level.boardCount,
          maxScore: level.maxScore ?? 0,
        })),
      demoLevels: config.enableDemo
        ? config.demoLevels
            .filter((level: ArrowStageConfigLevel) => level.boardCount > 0)
            .map((level: ArrowStageConfigLevel) => ({
              levelId: level.levelId,
              boardCount: level.boardCount,
              maxScore: level.maxScore ?? 0,
            }))
        : [],
    };
  }

  if (isMazeGameConfig(config)) {
    return {
      ...(config.id ? { id: config.id } : {}),
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      maxTimeBonus: config.maxTimeBonus ?? 0,
      enableDemo: config.enableDemo,
      levels: config.levels
        .filter((level: MazeStageConfigLevel) => level.boardCount > 0)
        .map((level: MazeStageConfigLevel, index: number) => ({
          levelId: level.levelId,
          boardCount: level.boardCount,
          maxScore: level.maxScore ?? 0,
          order: index + 1,
        })),
      demoLevels: config.enableDemo
        ? config.demoLevels
            .filter((level: MazeStageConfigLevel) => level.boardCount > 0)
            .map((level: MazeStageConfigLevel, index: number) => ({
              levelId: level.levelId,
              boardCount: level.boardCount,
              maxScore: level.maxScore ?? 0,
              order: index + 1,
            }))
        : [],
    };
  }

  if (isSpotTheDifferenceGameConfig(config)) {
    return {
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      maxTimeBonus: config.maxTimeBonus ?? 0,
      hintCount: config.hintCount,
      enableDemo: config.enableDemo,
      levels: (config.levels ?? [])
        .filter(
          (level: SpotTheDifferenceStageConfigLevel) => level.boardCount > 0,
        )
        .map((level: SpotTheDifferenceStageConfigLevel) => ({
          levelId: level.levelId,
          boardCount: level.boardCount,
          maxScore: level.maxScore ?? 0,
        })),
      demoLevels: config.enableDemo
        ? (config.demoLevels ?? [])
            .filter(
              (level: SpotTheDifferenceStageConfigLevel) =>
                level.boardCount > 0,
            )
            .map((level: SpotTheDifferenceStageConfigLevel) => ({
              levelId: level.levelId,
              boardCount: level.boardCount,
              maxScore: level.maxScore ?? 0,
            }))
        : [],
    };
  }

  if (isSequenceGameConfig(config)) {
    return {
      stageId: config.stageId,
      cellCount: config.cellCount ?? DEFAULT_SEQUENCE_CELL_COUNT,
      timeLimit: config.timeLimit,
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

  if (isInfinityGameConfig(config)) {
    return {
      stageId: config.stageId,
      timeLimit: config.timeLimit,
      maxTimeBonus: config.maxTimeBonus ?? 0,
      levels: (config.levels ?? []).map((level: ArrowStageConfigLevel) => ({
        levelId: level.levelId,
        boardCount: level.boardCount,
        maxScore: level.maxScore ?? 0,
      })),
    };
  }

  return config;
}

function applySequenceDefaults(config: SequenceConfig): SequenceConfig {
  return {
    ...config,
    cellCount: config.cellCount ?? DEFAULT_SEQUENCE_CELL_COUNT,
    levelDelay: config.levelDelay ?? DEFAULT_SEQUENCE_CONFIG.levelDelay,
    wrongMoveHandling:
      config.wrongMoveHandling ?? WRONG_MOVE_HANDLING.NEXT_SEQUENCE,
  };
}

/**
 * Registry keys are slugified versions of game names (lowercase, hyphens instead of spaces).
 */
export const GAME_REGISTRY: Record<string, GameMetadata<unknown, unknown>> = {
  "sequence-recall": defineGame({
    name: "Sequence Recall",
    apiBaseUrl: process.env.NEXT_PUBLIC_SEQUENCE_API_BASE_URL,
    stageConfig: {
      parse: (raw) =>
        raw ? applySequenceDefaults(raw as SequenceConfig) : null,
      serialize: (config) => serializeStageConfig(config as GameConfig),
      applyDefaults: (config) =>
        applySequenceDefaults(config as SequenceConfig),
      defaults: (stageId) =>
        applySequenceDefaults({
          id: "",
          createdAt: "",
          stageId,
          ...DEFAULT_SEQUENCE_CONFIG,
        }),
    },
    configComponent: SequenceGameConfig,
    allowConfigRenderWithoutExisting: true,
    // poolComponent: DefaultPoolView,
    // poolColumns: getDefaultBoardsColumns,
  }),
  arrows: defineGame({
    name: "Arrows",
    apiBaseUrl:
      process.env.NEXT_PUBLIC_ARROWS_API_BASE_URL ??
      process.env.NEXT_PUBLIC_ARROW_API_BASE_URL,
    // tokenResolver: () => ARROWS_TEMP_TOKEN,
    stageConfig: {
      parse: (raw) => parseArrowStageConfig(raw),
      serialize: (config) => serializeStageConfig(config as GameConfig),
      defaults: (stageId: string): ArrowConfig => ({
        id: "",
        stageId,
        timeLimit: 60,
        maxTimeBonus: 0,
        enableDemo: false,
        levels: [],
        demoLevels: [],
        createdAt: "",
      }),
    },
    allowConfigRenderWithoutExisting: true,
    configComponent: ArrowGameConfig,
    poolComponent: DefaultPoolView,
    poolColumns: getArrowsColumns,
    poolSampleJson: ARROW_SAMPLE_JSON,
    poolSampleJsonFileName: "arrows.json",
  }),
  "infinity-loop": defineGame({
    name: "Infinity Loop",
    apiBaseUrl: process.env.NEXT_PUBLIC_INFINITY_API_BASE_URL,
    // tokenResolver: () => INFINITY_TEMP_TOKEN,
    stageConfig: {
      parse: (raw) => parseInfinityStageConfig(raw),
      serialize: (config) => serializeStageConfig(config as GameConfig),
      defaults: (stageId: string): InfinityConfig => ({
        id: "",
        stageId,
        timeLimit: 60,
        maxTimeBonus: 0,
        levels: [],
        createdAt: "",
      }),
    },
    allowConfigRenderWithoutExisting: true,
    configComponent: InfinityGameConfig,
    poolComponent: InfinityLoopPoolView,
    poolColumns: getInfinityColumns,
  }),
  "block-fill": defineGame({
    name: "Block Fill",
    apiBaseUrl: process.env.NEXT_PUBLIC_BLOCK_API_BASE_URL,
    // tokenResolver: () => BLOCK_TEMP_TOKEN,
    stageConfig: {
      parse: (raw) => parseBlockFillStageConfig(raw),
      serialize: (config) => serializeStageConfig(config as GameConfig),
      defaults: (stageId: string): BlockFillConfig => ({
        id: "",
        stageId,
        timeLimit: 60,
        maxTimeBonus: 0,
        enableDemo: false,
        levels: [],
        demoLevels: [],
        createdAt: "",
        __kind: "block-fill",
      }),
    },
    allowConfigRenderWithoutExisting: true,
    configComponent: BlockFillGameConfig,
    poolComponent: DefaultPoolView,
    poolColumns: getBlockFillColumns,
    poolSampleJson: BLOCK_SAMPLE_JSON,
    poolSampleJsonFileName: "blockFill.json",
  }),
  "sliding-puzzle": defineGame({
    name: "Sliding Puzzle",
    apiBaseUrl: process.env.NEXT_PUBLIC_SLIDING_PUZZLE_API_BASE_URL,
    // tokenResolver: () => SLIDING_PUZZLE_TEMP_TOKEN,
    // tokenResolver: () => SLIDING_PUZZLE_TEMP_TOKEN,
    stageConfig: {
      parse: (raw) => parseSlidingPuzzleStageConfig(raw),
      serialize: (config) => serializeStageConfig(config as GameConfig),
      defaults: (stageId: string): SlidingPuzzleConfig => ({
        id: "",
        stageId,
        timeLimit: 60,
        maxTimeBonus: 0,
        enableDemo: false,
        enableNumbers: true,
        levels: [],
        demoLevels: [],
        createdAt: "",
        __kind: "sliding-puzzle",
      }),
    },
    allowConfigRenderWithoutExisting: true,
    configComponent: SlidingPuzzleGameConfig,
    poolComponent: DefaultPoolView,
    poolColumns: getSlidingPuzzleColumns,
  }),
  "memory-card-matching": defineGame({
    name: "Memory Card Matching",
    apiBaseUrl: MCM_API_BASE_URL,
    // tokenResolver: () => MCM_TEMP_TOKEN,
    stageConfig: {
      parse: (raw) => parseMemoryCardMatchingStageConfig(raw),
      serialize: (config) => serializeStageConfig(config as GameConfig),
      listQuery: () => ({ skip: 0, limit: 20 }),
      defaults: (stageId: string): MemoryCardMatchingConfig => ({
        id: "",
        stageId,
        timeLimit: 120,
        maxTimeBonus: 0,
        enableDemo: false,
        levels: [],
        demoLevels: [],
        createdAt: "",
        __kind: "memory-card-matching",
      }),
    },
    allowConfigRenderWithoutExisting: true,
    configComponent: MemoryCardMatchingGameConfig,
    poolComponent: MemoryCardMatchingLevelsView,
    poolTabLabel: "Levels",
  }),
  sudoku: defineGame({
    name: "Sudoku",
    apiBaseUrl: process.env.NEXT_PUBLIC_SUDOKU_API_BASE_URL,
    // tokenResolver: () => SUDOKU_TEMP_TOKEN,
    stageConfig: {
      parse: (raw) => parseSudokuStageConfig(raw),
      serialize: (config) => serializeStageConfig(config as GameConfig),
      defaults: (stageId: string): SudokuConfig => ({
        id: "",
        stageId,
        timeLimit: 60,
        maxTimeBonus: 0,
        enableDemo: false,
        levels: [],
        demoLevels: [],
        createdAt: "",
        __kind: "sudoku",
      }),
    },
    allowConfigRenderWithoutExisting: true,
    configComponent: SudokuGameConfig,
    poolComponent: DefaultPoolView,
    poolColumns: getSudokuColumns,
  }),
  "maze-navigation": defineGame({
    name: "Maze Navigation",
    apiBaseUrl: process.env.NEXT_PUBLIC_MAZE_API_BASE_URL,
    // tokenResolver: () => MAZE_TEMP_TOKEN,
    stageConfig: {
      parse: (raw) => parseMazeStageConfig(raw),
      serialize: (config) => serializeStageConfig(config as GameConfig),
      defaults: (stageId: string): MazeConfig => ({
        id: "",
        stageId,
        timeLimit: 60,
        maxTimeBonus: 0,
        enableDemo: false,
        levels: [],
        demoLevels: [],
        createdAt: "",
        __kind: "maze",
      }),
    },
    allowConfigRenderWithoutExisting: true,
    configComponent: MazeGameConfig,
    poolComponent: DefaultPoolView,
    poolColumns: getMazeColumns,
  }),
  "spot-the-difference": defineGame({
    name: "Spot The Difference",
    apiBaseUrl: process.env.NEXT_PUBLIC_SPOT_THE_DIFFERENCE_API_BASE_URL,
    stageConfig: {
      parse: (raw) => parseSpotTheDifferenceStageConfig(raw),
      serialize: (config) => serializeStageConfig(config as GameConfig),
      defaults: (stageId: string): SpotTheDifferenceConfig => ({
        id: "",
        stageId,
        timeLimit: 300,
        maxTimeBonus: 0,
        hintCount: 2,
        enableDemo: false,
        levels: [],
        demoLevels: [],
        createdAt: "",
        __kind: "spot-the-difference",
      }),
    },
    allowConfigRenderWithoutExisting: true,
    configComponent: SpotTheDifferenceGameConfig,
    poolComponent: SpotTheDifferencePoolView,
    poolSampleJson: {
      findImageUrl: "uploads/spot-the-difference/demo-find.jpg",
      referenceImageUrl: "uploads/spot-the-difference/demo-ref.jpg",
      imageWidth: 500,
      imageHeight: 500,
      differences: [
        { x: 100, y: 120, width: 40, height: 40 },
        { x: 250, y: 300, width: 60, height: 50 },
      ],
    },
    poolSampleJsonFileName: "spot-the-difference-sample.json",
  }),
};

export function getGameMetadata(name: string) {
  const slug = slugifyGameName(name);
  return GAME_REGISTRY[slug] || null;
}

export function getGameApiBaseUrl(name: string) {
  const slug = slugifyGameName(name);
  return GAME_REGISTRY[slug]?.apiBaseUrl;
}

export function getGameStageConfigAdapter(name: string) {
  const slug = slugifyGameName(name);
  return (
    (GAME_REGISTRY[slug]?.stageConfig as
      | StageConfigAdapter<GameConfig>
      | undefined) ?? null
  );
}

export function resolveGameToken(name: string | undefined, token?: string) {
  if (!name) return token;
  const slug = slugifyGameName(name);
  const resolver = GAME_REGISTRY[slug]?.tokenResolver;
  return resolver ? resolver(token) : token;
}
