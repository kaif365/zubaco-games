import { PrismaService } from '@common/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

export interface DemoBoard {
    id: string;
    gridSize: { x: number; y: number };
    fullImageUrl: string;
    displayTime: number;
    enableNumbers: boolean;
    initialPieces: number[];
}

export interface DemoLevel {
    levelId: string;
    levelName: string;
    boards: DemoBoard[];
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
                enableNumbers: true,
                demoLevels: {
                    where: { deletedAt: null },
                    orderBy: { order: 'asc' },
                    select: {
                        levelId: true,
                        boardCount: true,
                        displayTime: true,
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

        const levels: DemoLevel[] = [];

        for (const demoLevel of stageConfig.demoLevels) {
            const boardIds = await this.pickRandomBoardIds(demoLevel.levelId, demoLevel.boardCount);
            if (boardIds.length === 0) {
                continue;
            }

            const [boards, boardShuffleRows] = await Promise.all([
                this.prisma.board.findMany({
                    where: { id: { in: boardIds } },
                    select: {
                        id: true,
                        levelId: true,
                        gridX: true,
                        gridY: true,
                        fullImageUrl: true,
                    },
                }),
                this.prisma.boardShuffle.findMany({
                    where: { boardId: { in: boardIds }, deletedAt: null },
                    select: { boardId: true, pieces: true },
                }),
            ]);

            const shufflesByBoard = new Map<string, number[][]>();
            for (const s of boardShuffleRows) {
                const arr = shufflesByBoard.get(s.boardId) ?? [];
                arr.push(s.pieces);
                shufflesByBoard.set(s.boardId, arr);
            }

            const boardMap = new Map(boards.map((b) => [b.id, b]));
            const orderedBoards = boardIds.map((id) => boardMap.get(id)!).filter(Boolean);

            let sortOrder = 0;
            for (const board of orderedBoards) {
                const options = shufflesByBoard.get(board.id) ?? [];
                if (options.length === 0) {
                    continue;
                }
                const initialPieces = options[Math.floor(Math.random() * options.length)];

                await this.prisma.userStageDemoBoard.create({
                    data: {
                        userId,
                        stageId,
                        levelId: board.levelId,
                        boardId: board.id,
                        gridX: board.gridX,
                        gridY: board.gridY,
                        fullImageUrl: board.fullImageUrl,
                        displayTime: demoLevel.displayTime,
                        initialPieces,
                        sortOrder: sortOrder++,
                    },
                });

                const demoBoard: DemoBoard = {
                    id: board.id,
                    gridSize: { x: board.gridX, y: board.gridY },
                    fullImageUrl: board.fullImageUrl,
                    displayTime: demoLevel.displayTime,
                    enableNumbers: stageConfig.enableNumbers,
                    initialPieces,
                };

                const levelEntry = levels.find((level) => level.levelId === demoLevel.levelId);
                if (levelEntry) {
                    levelEntry.boards.push(demoBoard);
                } else {
                    levels.push({
                        levelId: demoLevel.levelId,
                        levelName: demoLevel.level.name,
                        boards: [demoBoard],
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
        const [demoBoards, stageConfig] = await Promise.all([
            this.prisma.userStageDemoBoard.findMany({
                where: { userId, stageId },
                orderBy: [{ createdAt: 'asc' }, { sortOrder: 'asc' }],
                include: {
                    board: {
                        select: { level: { select: { id: true, name: true } } },
                    },
                },
            }),
            this.prisma.stageConfig.findFirst({
                where: { stageId, deletedAt: null },
                select: { enableNumbers: true },
            }),
        ]);

        const levels: DemoLevel[] = [];

        for (const demoBoard of demoBoards) {
            const board: DemoBoard = {
                id: demoBoard.boardId,
                gridSize: { x: demoBoard.gridX, y: demoBoard.gridY },
                fullImageUrl: demoBoard.fullImageUrl,
                displayTime: demoBoard.displayTime,
                enableNumbers: stageConfig?.enableNumbers ?? true,
                initialPieces: demoBoard.initialPieces as number[],
            };

            const levelEntry = levels.find((level) => level.levelId === demoBoard.levelId);
            if (levelEntry) {
                levelEntry.boards.push(board);
            } else {
                levels.push({
                    levelId: demoBoard.levelId,
                    levelName: demoBoard.board.level.name,
                    boards: [board],
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
