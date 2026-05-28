import { DEFAULT_STAGE_CONFIG } from '@common/constants';
import type { PrismaService } from '@common/prisma/prisma.service';

export interface DefaultStageConfigOptions {
    timeLimit?: number;
    maxTimeBonus?: number;
    enableDemo?: boolean;
    enableNumbers?: boolean;
}

/**
 * Build a default stage config payload for a given stage.
 * Includes all non-demo levels that have at least one board, each with boardCount=1.
 * Returns null if no eligible levels exist.
 *
 * @param {string} stageId - stage id value.
 * @param {PrismaService} prisma - prisma value.
 * @param {DefaultStageConfigOptions} options - options value.
 *
 * @returns {Promise<object | null>} The asynchronous result.
 */
export async function buildDefaultStageConfig(
    stageId: string,
    prisma: PrismaService,
    options: DefaultStageConfigOptions = {},
) {
    const timeLimit = options.timeLimit ?? DEFAULT_STAGE_CONFIG.TIME_LIMIT;
    const maxTimeBonus = options.maxTimeBonus ?? DEFAULT_STAGE_CONFIG.MAX_TIME_BONUS;
    const enableDemo = options.enableDemo ?? false;
    const enableNumbers = options.enableNumbers ?? DEFAULT_STAGE_CONFIG.ENABLE_NUMBERS;

    const minBoardsNeeded = Math.min(
        DEFAULT_STAGE_CONFIG.BOARD_COUNT,
        DEFAULT_STAGE_CONFIG.DEMO_BOARD_COUNT,
    );

    const allLevels = await prisma.level.findMany({
        where: { isDemo: false, deletedAt: null },
        select: {
            id: true,
            _count: { select: { boards: { where: { deletedAt: null } } } },
        },
        orderBy: { createdAt: 'asc' },
    });

    const eligibleLevels = allLevels.filter(
        (level) =>
            level._count.boards >=
            (enableDemo ? minBoardsNeeded : DEFAULT_STAGE_CONFIG.BOARD_COUNT),
    );

    if (eligibleLevels.length === 0) {
        return null;
    }

    const levels: {
        levelId: string;
        boardCount: number;
        displayTime: number;
        order: number;
        maxScore: number;
    }[] = [];
    const demoLevels: {
        levelId: string;
        boardCount: number;
        displayTime: number;
        order: number;
    }[] = [];

    let levelOrder = 0;
    let demoOrder = 0;

    for (const level of eligibleLevels) {
        const actualCount = level._count.boards;

        if (enableDemo) {
            const demoAssigned = Math.min(DEFAULT_STAGE_CONFIG.DEMO_BOARD_COUNT, actualCount);
            const remaining = actualCount - demoAssigned;

            demoLevels.push({
                levelId: level.id,
                boardCount: demoAssigned,
                displayTime: DEFAULT_STAGE_CONFIG.DISPLAY_TIME,
                order: demoOrder++,
            });

            if (remaining >= DEFAULT_STAGE_CONFIG.BOARD_COUNT) {
                levels.push({
                    levelId: level.id,
                    boardCount: DEFAULT_STAGE_CONFIG.BOARD_COUNT,
                    displayTime: DEFAULT_STAGE_CONFIG.DISPLAY_TIME,
                    order: levelOrder++,
                    maxScore: DEFAULT_STAGE_CONFIG.MAX_SCORE,
                });
            }
        } else {
            levels.push({
                levelId: level.id,
                boardCount: DEFAULT_STAGE_CONFIG.BOARD_COUNT,
                displayTime: DEFAULT_STAGE_CONFIG.DISPLAY_TIME,
                order: levelOrder++,
                maxScore: DEFAULT_STAGE_CONFIG.MAX_SCORE,
            });
        }
    }

    if (levels.length === 0 && !enableDemo) {
        return null;
    }

    return { stageId, timeLimit, maxTimeBonus, enableDemo, enableNumbers, levels, demoLevels };
}
