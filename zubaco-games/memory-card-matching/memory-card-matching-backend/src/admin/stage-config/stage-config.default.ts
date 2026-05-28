import { DEFAULT_STAGE_CONFIG } from "@common/constants";
import type { PrismaService } from "@common/prisma/prisma.service";

export interface DefaultStageConfigOptions {
  timeLimit?: number;
  boardCount?: number;
  enableDemo?: boolean;
}

/**
 * Build the default stage-config payload for a newly attached stage.
 *
 * @param {string} stageId - stage id value.
 * @param {PrismaService} prisma - prisma value.
 * @param {DefaultStageConfigOptions} options - options value.
 *
 * @returns {Promise<{ stageId: string; levels: { difficultyId: string; boardCount: number; order: number; }[]; demoLevels: { difficultyId: string; boardCount: number; order: number; }[]; gameTimeLimitSeconds: number; enableDemo: boolean; } | null>} The asynchronous result.
 */
export async function buildDefaultStageConfig(
  stageId: string,
  prisma: PrismaService,
  options: DefaultStageConfigOptions = {},
) {
  const boardCount = options.boardCount ?? DEFAULT_STAGE_CONFIG.BOARD_COUNT;
  const demoBoardCount = DEFAULT_STAGE_CONFIG.DEMO_BOARD_COUNT;
  const gameTimeLimitSeconds =
    options.timeLimit ?? DEFAULT_STAGE_CONFIG.TIME_LIMIT;
  const enableDemo = options.enableDemo ?? DEFAULT_STAGE_CONFIG.ENABLE_DEMO;

  const difficulties = await prisma.difficulty.findMany({
    where: {
      deletedAt: null,
      levels: {
        some: {
          deletedAt: null,
        },
      },
    },
    orderBy: [{ difficultyScore: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      levels: {
        where: { deletedAt: null },
        select: { id: true },
      },
    },
  });

  if (difficulties.length === 0) {
    return null;
  }

  const levels: Array<{
    difficultyId: string;
    boardCount: number;
    order: number;
  }> = [];
  const demoLevels: Array<{
    difficultyId: string;
    boardCount: number;
    order: number;
  }> = [];

  let levelOrder = 0;
  let demoOrder = 0;

  for (const difficulty of difficulties) {
    const availableCount = difficulty.levels.length;

    if (enableDemo) {
      if (availableCount < demoBoardCount) {
        continue;
      }

      demoLevels.push({
        difficultyId: difficulty.id,
        boardCount: demoBoardCount,
        order: demoOrder++,
      });

      const remaining = availableCount - demoBoardCount;
      if (remaining >= boardCount) {
        levels.push({
          difficultyId: difficulty.id,
          boardCount,
          order: levelOrder++,
        });
      }
      continue;
    }

    if (availableCount < boardCount) {
      continue;
    }

    levels.push({
      difficultyId: difficulty.id,
      boardCount,
      order: levelOrder++,
    });
  }

  if (levels.length === 0 && !enableDemo) {
    return null;
  }

  return {
    stageId,
    levels,
    demoLevels,
    gameTimeLimitSeconds,
    enableDemo,
  };
}
