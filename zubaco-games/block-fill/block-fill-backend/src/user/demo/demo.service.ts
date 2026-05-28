import { randomUUID } from 'node:crypto';

import { GAME_TYPES } from '@common/constants';
import { PrismaService } from '@common/prisma/prisma.service';
import { toBoardShape } from '@common/utils/block-fill-board.util';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma';

import { formatBlockFillBoard } from '../../game/utils/board-formatter';

export interface DemoLevelResult {
    levelId: string;
    levelName: string;
    boards: ReturnType<typeof formatBlockFillBoard>[];
}

export interface DemoResult {
    stageId: string;
    enableDemo: boolean;
    alreadySeen: boolean;
    levels: DemoLevelResult[];
}

type StageConfigWithDemoLevels = Prisma.StageConfigGetPayload<{
    include: {
        demoLevels: {
            include: {
                level: {
                    select: {
                        name: true;
                    };
                };
            };
        };
    };
}>;

type DemoBoardCandidate = {
    id: string;
    levelId: string;
    levelName: string;
    name: string | null;
    gridX: number;
    gridY: number;
    timeLimit: number;
    pairs: unknown;
};

type DemoSnapshotRecord = {
    id: string;
    levelId: string;
    sourceBoardId: string;
    name: string | null;
    gridX: number;
    gridY: number;
    pairsSnapshot: unknown;
};

/**
 * Builds and reuses user-specific demo board snapshots for local demo playback.
 */
@Injectable()
export class DemoService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Fetches the demo payload, generating a stable snapshot on first access.
     * @param {string} userId - The authenticated user identifier.
     * @param {string} stageId - The authenticated stage identifier.
     * @returns {Promise<DemoResult>} The demo response payload.
     */
    async getDemo(userId: string, stageId: string): Promise<DemoResult> {
        const stageConfig = await this.prisma.stageConfig.findFirst({
            where: {
                stageId,
                deletedAt: null,
            },
            include: {
                demoLevels: {
                    where: { deletedAt: null },
                    include: {
                        level: {
                            select: {
                                name: true,
                            },
                        },
                    },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!stageConfig) {
            throw new NotFoundException('STAGE_CONFIG_NOT_FOUND');
        }

        const existingGameSession = await this.prisma.gameSession.findFirst({
            where: {
                userId,
                stageId,
                deletedAt: null,
            },
            select: { id: true },
        });
        const alreadySeen = Boolean(existingGameSession);

        if (!stageConfig.enableDemo) {
            return {
                stageId,
                enableDemo: false,
                alreadySeen,
                levels: [],
            };
        }

        const existingSnapshot = await this.prisma.userStageDemoBoard.findFirst({
            where: { userId, stageId },
            select: { id: true },
        });

        if (existingSnapshot) {
            return {
                stageId,
                enableDemo: true,
                alreadySeen,
                levels: await this.getExistingDemoLevels(userId, stageId),
            };
        }

        if (stageConfig.demoLevels.length === 0) {
            return {
                stageId,
                enableDemo: true,
                alreadySeen,
                levels: [],
            };
        }

        try {
            const levels = await this.prisma.$transaction(async (tx) => {
                const alreadyCreated = await tx.userStageDemoBoard.findFirst({
                    where: { userId, stageId },
                    select: { id: true },
                });

                if (alreadyCreated) {
                    return this.getExistingDemoLevels(userId, stageId, tx);
                }

                return this.createDemoSnapshot(userId, stageId, stageConfig, tx);
            });

            return {
                stageId,
                enableDemo: true,
                alreadySeen,
                levels,
            };
        } catch (error) {
            if (this.isUniqueConstraintError(error)) {
                return {
                    stageId,
                    enableDemo: true,
                    alreadySeen,
                    levels: await this.getExistingDemoLevels(userId, stageId),
                };
            }

            throw error;
        }
    }

    /**
     * Generates the initial persisted demo snapshot for the user and stage.
     * @param {string} userId - The authenticated user identifier.
     * @param {string} stageId - The stage identifier.
     * @param {StageConfigWithDemoLevels} stageConfig - The active stage config with demo levels.
     * @param {Prisma.TransactionClient} tx - The open Prisma transaction client.
     * @returns {Promise<DemoLevelResult[]>} The grouped demo response levels.
     */
    private async createDemoSnapshot(
        userId: string,
        stageId: string,
        stageConfig: StageConfigWithDemoLevels,
        tx: Prisma.TransactionClient,
    ): Promise<DemoLevelResult[]> {
        const levels: DemoLevelResult[] = [];
        const usedBoardIds = new Set<string>();
        let roundNumber = 1;

        for (const demoLevel of stageConfig.demoLevels) {
            const selectedBoards = await this.pickBoardsForDemoLevel({
                userId,
                levelId: demoLevel.levelId,
                boardCount: demoLevel.boardCount,
                excludeBoardIds: [...usedBoardIds],
                tx,
            });

            if (selectedBoards.length === 0) {
                continue;
            }

            const boards: ReturnType<typeof formatBlockFillBoard>[] = [];

            for (const board of selectedBoards) {
                usedBoardIds.add(board.id);

                const snapshot = await tx.userStageDemoBoard.create({
                    data: {
                        userId,
                        stageId,
                        levelId: board.levelId,
                        sourceBoardId: board.id,
                        roundNumber,
                        levelName: board.levelName,
                        name: board.name,
                        gridX: board.gridX,
                        gridY: board.gridY,
                        timeLimit: board.timeLimit,
                        pairsSnapshot: board.pairs as Prisma.InputJsonValue,
                    },
                });

                boards.push(this.formatDemoBoard(snapshot.id, board));
                roundNumber += 1;
            }

            levels.push({
                levelId: demoLevel.levelId,
                levelName: demoLevel.level.name,
                boards,
            });
        }

        return levels;
    }

    /**
     * Loads a previously generated demo snapshot and groups it by configured level.
     * @param {string} userId - The authenticated user identifier.
     * @param {string} stageId - The stage identifier.
     * @param {Prisma.TransactionClient} [client] - Optional transaction client.
     * @returns {Promise<DemoLevelResult[]>} The grouped demo response levels.
     */
    private async getExistingDemoLevels(
        userId: string,
        stageId: string,
        client?: Prisma.TransactionClient,
    ): Promise<DemoLevelResult[]> {
        const prisma = client ?? this.prisma;
        const snapshotBoards = await prisma.userStageDemoBoard.findMany({
            where: { userId, stageId },
            orderBy: { roundNumber: 'asc' },
        });

        const levels: DemoLevelResult[] = [];
        const levelMap = new Map<string, DemoLevelResult>();

        for (const snapshot of snapshotBoards) {
            let level = levelMap.get(snapshot.levelId);
            if (!level) {
                level = {
                    levelId: snapshot.levelId,
                    levelName: snapshot.levelName ?? 'Unknown Level',
                    boards: [],
                };
                levelMap.set(snapshot.levelId, level);
                levels.push(level);
            }

            level.boards.push(this.formatDemoBoard(snapshot.id, snapshot));
        }

        return levels;
    }

    /**
     * Picks distinct boards for a demo level while preferring boards the user has not played recently.
     * @param {{ userId: string; levelId: string; boardCount: number; excludeBoardIds: string[]; tx: Prisma.TransactionClient; }} options - The board selection options.
     * @returns {Promise<DemoBoardCandidate[]>} The selected boards for the level.
     */
    private async pickBoardsForDemoLevel(options: {
        userId: string;
        levelId: string;
        boardCount: number;
        excludeBoardIds: string[];
        tx: Prisma.TransactionClient;
    }): Promise<DemoBoardCandidate[]> {
        const availableBoards = await options.tx.board.findMany({
            where: {
                levelId: options.levelId,
                deletedAt: null,
                gameType: GAME_TYPES.BLOCK_FILL,
            },
            select: {
                id: true,
                levelId: true,
                name: true,
                gridX: true,
                gridY: true,
                timeLimit: true,
                pairs: true,
                level: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (availableBoards.length < options.boardCount) {
            throw new ConflictException('INSUFFICIENT_BOARDS_FOR_STAGE_LEVEL');
        }

        const excluded = new Set(options.excludeBoardIds);
        const candidateBoards = availableBoards
            .filter((board) => !excluded.has(board.id))
            .map((board) => ({
                id: board.id,
                levelId: board.levelId,
                levelName: board.level.name,
                name: board.name,
                gridX: board.gridX,
                gridY: board.gridY,
                timeLimit: board.timeLimit,
                pairs: board.pairs,
            }));

        if (candidateBoards.length < options.boardCount) {
            throw new ConflictException('INSUFFICIENT_DISTINCT_BOARDS_FOR_SESSION_SEQUENCE');
        }

        const playedBoards = await options.tx.gameSessionBoard.findMany({
            where: {
                levelId: options.levelId,
                deletedAt: null,
                boardId: { in: candidateBoards.map((board) => board.id) },
                session: {
                    userId: options.userId,
                    deletedAt: null,
                },
            },
            orderBy: { createdAt: 'desc' },
            select: { boardId: true },
        });

        const lastPlayedOrder = new Map<string, number>();
        for (const item of playedBoards) {
            if (!lastPlayedOrder.has(item.boardId)) {
                lastPlayedOrder.set(item.boardId, lastPlayedOrder.size);
            }
        }

        const sorted = [...candidateBoards].sort((left, right) => {
            const leftOrder = lastPlayedOrder.get(left.id) ?? -1;
            const rightOrder = lastPlayedOrder.get(right.id) ?? -1;
            return leftOrder - rightOrder;
        });

        const neverPlayed = sorted.filter((board) => !lastPlayedOrder.has(board.id));
        const alreadyPlayed = sorted.filter((board) => lastPlayedOrder.has(board.id));

        return [...neverPlayed, ...alreadyPlayed].slice(0, options.boardCount);
    }

    /**
     * Formats a snapshot board into the public board payload used by the frontend.
     * @param {string} sessionBoardId - The stable snapshot identifier for the board.
     * @param {DemoBoardCandidate | DemoSnapshotRecord} board - The board source to format.
     * @returns {ReturnType<typeof formatBlockFillBoard>} The formatted board payload.
     */
    private formatDemoBoard(
        sessionBoardId: string,
        board: DemoBoardCandidate | DemoSnapshotRecord,
    ): ReturnType<typeof formatBlockFillBoard> {
        return formatBlockFillBoard({
            sessionBoardId: sessionBoardId || randomUUID(),
            board: {
                id: 'sourceBoardId' in board ? board.sourceBoardId : board.id,
                levelId: board.levelId,
            },
            boardShape: toBoardShape({
                name: board.name,
                gridX: board.gridX,
                gridY: board.gridY,
                rawPairs: 'pairsSnapshot' in board ? board.pairsSnapshot : board.pairs,
            }),
            version: 0,
            paths: [],
        });
    }

    /**
     * Checks whether a thrown error is a Prisma unique-constraint conflict.
     * @param {unknown} error - The thrown error.
     * @returns {boolean} Whether the error is a unique-constraint conflict.
     */
    private isUniqueConstraintError(error: unknown): boolean {
        return (
            error instanceof Error &&
            'code' in error &&
            (error as { code: unknown }).code === 'P2002'
        );
    }
}
