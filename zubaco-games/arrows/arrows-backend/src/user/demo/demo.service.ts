import { PrismaService } from '@common/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

import { formatBoard, FormattedBoard } from '../../game/utils/board-formatter';

export interface DemoLevel {
    levelId: string;
    levelName: string;
    boards: FormattedBoard[];
}

export interface DemoResult {
    stageId: string;
    enableDemo: boolean;
    alreadySeen: boolean;
    levels?: DemoLevel[];
}

@Injectable()
export class DemoService {
    /**
     * Create a new instance.
     *
     * @param {PrismaService} prisma - prisma value.
     */
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Get demo.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<DemoResult>} The asynchronous result.
     */
    async getDemo(userId: string, stageId: string): Promise<DemoResult> {
        const stageConfig = await this.prisma.stageConfig.findFirst({
            where: { stageId, deletedAt: null },
            select: {
                enableDemo: true,
                demoLevels: {
                    where: { deletedAt: null },
                    orderBy: { order: 'asc' },
                    select: {
                        levelId: true,
                        boardCount: true,
                        order: true,
                        level: { select: { id: true, name: true } },
                    },
                },
            },
        });

        if (!stageConfig) {
            throw new NotFoundException('STAGE_CONFIG_NOT_FOUND');
        }

        // Once the real game has started, the demo is permanently considered seen.
        const existingGameSession = await this.prisma.gameSession.findFirst({
            where: { userId, stageId },
            select: { id: true },
        });

        if (!stageConfig.enableDemo) {
            return {
                stageId,
                enableDemo: stageConfig.enableDemo,
                alreadySeen: Boolean(existingGameSession),
                levels: [],
            };
        }

        if (existingGameSession) {
            return { stageId, enableDemo: stageConfig.enableDemo, alreadySeen: true, levels: [] };
        }

        // Before game-start, existing snapshots are the user's reusable demo payload.
        const existing = await this.prisma.userStageDemoBoard.findFirst({
            where: { userId, stageId },
            select: { id: true },
        });
        if (existing) {
            return {
                stageId,
                enableDemo: stageConfig.enableDemo,
                alreadySeen: false,
                levels: await this.getExistingDemoLevels(userId, stageId),
            };
        }

        if (stageConfig.demoLevels.length === 0) {
            return { stageId, enableDemo: stageConfig.enableDemo, alreadySeen: false, levels: [] };
        }

        // Pick random boards for each demo level
        const levels: DemoLevel[] = [];

        for (const demoLevel of stageConfig.demoLevels) {
            const picked = await this.pickRandomBoardIds(demoLevel.levelId, demoLevel.boardCount);

            if (picked.length === 0) {
                continue;
            }

            const boardIds = picked;

            const boards = await this.prisma.board.findMany({
                where: { id: { in: boardIds } },
                include: {
                    arrows: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
                },
            });

            // Preserve random order from SQL
            const boardMap = new Map(boards.map((b) => [b.id, b]));
            const orderedBoards = boardIds.map((id) => boardMap.get(id)!).filter(Boolean);

            // Create snapshot rows
            let sortOrder = 0;
            for (const board of orderedBoards) {
                const demoBoard = await this.prisma.userStageDemoBoard.create({
                    data: {
                        userId,
                        stageId,
                        levelId: board.levelId,
                        boardId: board.id,
                        gridX: board.gridX,
                        gridY: board.gridY,
                        sortOrder: sortOrder++,
                        arrows: {
                            createMany: {
                                data: board.arrows.map((a, i) => ({
                                    arrowId: a.id,
                                    color: a.color,
                                    headDirection: a.headDirection,
                                    waypoints: a.waypoints ?? [],
                                    sortOrder: i,
                                })),
                            },
                        },
                    },
                    include: { arrows: { orderBy: { sortOrder: 'asc' } } },
                });

                // Build a Board-like object from snapshot for formatter
                const snapshotBoard = {
                    ...board,
                    arrows: demoBoard.arrows.map((a) => ({
                        id: a.id,
                        boardId: board.id,
                        color: a.color,
                        headDirection: a.headDirection,
                        waypoints: a.waypoints,
                        sortOrder: a.sortOrder,
                        createdAt: a.createdAt,
                        updatedAt: a.createdAt,
                        deletedAt: null,
                    })),
                };

                const levelEntry = levels.find((level) => level.levelId === demoLevel.levelId);
                if (levelEntry) {
                    levelEntry.boards.push(formatBoard(snapshotBoard, demoBoard.arrows));
                } else {
                    levels.push({
                        levelId: demoLevel.levelId,
                        levelName: demoLevel.level.name,
                        boards: [formatBoard(snapshotBoard, demoBoard.arrows)],
                    });
                }
            }
        }

        return { stageId, enableDemo: stageConfig.enableDemo, alreadySeen: false, levels };
    }

    /**
     * Get existing snapshotted demo levels.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<DemoLevel[]>} The asynchronous result.
     */
    private async getExistingDemoLevels(userId: string, stageId: string): Promise<DemoLevel[]> {
        const demoBoards = await this.prisma.userStageDemoBoard.findMany({
            where: { userId, stageId },
            orderBy: [{ createdAt: 'asc' }, { sortOrder: 'asc' }],
            include: {
                arrows: { orderBy: { sortOrder: 'asc' } },
                board: {
                    select: { id: true, name: true, level: { select: { id: true, name: true } } },
                },
            },
        });

        const levels: DemoLevel[] = [];

        for (const demoBoard of demoBoards) {
            const snapshotBoard = {
                id: demoBoard.boardId,
                name: demoBoard.board.name,
                gridX: demoBoard.gridX,
                gridY: demoBoard.gridY,
            };
            const formattedBoard = formatBoard(snapshotBoard, demoBoard.arrows);
            const levelEntry = levels.find((level) => level.levelId === demoBoard.levelId);

            if (levelEntry) {
                levelEntry.boards.push(formattedBoard);
            } else {
                levels.push({
                    levelId: demoBoard.levelId,
                    levelName: demoBoard.board.level.name,
                    boards: [formattedBoard],
                });
            }
        }

        return levels;
    }

    /**
     * Handle pick random board ids.
     *
     * @param {string} levelId - level id value.
     * @param {number} count - count value.
     *
     * @returns {Promise<string[]>} The asynchronous result.
     */
    private async pickRandomBoardIds(levelId: string, count: number): Promise<string[]> {
        if (count <= 0) {
            return [];
        }

        const rows = await this.prisma.board.findMany({
            where: { levelId, deletedAt: null },
            select: { id: true },
            orderBy: { id: 'asc' },
        });

        return rows
            .map((row) => row.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, count);
    }
}
