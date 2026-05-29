import { PrismaService } from '@common/prisma/prisma.service';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { generateSolvableShuffle, isSolvable, isSolved } from '../../game/utils/shuffle.util';

import { CreateBoardDto } from './dto/create-board.dto';
import { DeleteBoardsDto } from './dto/delete-boards.dto';
import { ListBoardsDto } from './dto/list-boards.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardService {
    /**
     * Create a new instance.
     *
     * @param {PrismaService} prisma - prisma value.
     */
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Validate submitted shuffles against the board grid dimensions.
     * Throws BadRequestException on the first invalid shuffle found.
     *
     * @param {number[][]} shuffles - submitted shuffle pieces.
     * @param {number} gridX - grid x value.
     * @param {number} gridY - grid y value.
     *
     * @returns {void} Resolves when validation succeeds.
     */
    private validateShuffles(shuffles: number[][], gridX: number, gridY: number): void {
        const totalTiles = gridX * gridY;
        for (let i = 0; i < shuffles.length; i++) {
            const shuffle = shuffles[i];

            if (shuffle.length !== totalTiles) {
                throw new BadRequestException(
                    `SHUFFLE_INVALID_LENGTH: shuffle[${i}] must have ${totalTiles} elements`,
                );
            }

            const seen = new Set<number>();
            let hasBlank = false;

            for (const v of shuffle) {
                if (v === -1) {
                    if (hasBlank) {
                        throw new BadRequestException(
                            `SHUFFLE_MULTIPLE_BLANKS: shuffle[${i}] contains more than one blank (-1)`,
                        );
                    }
                    hasBlank = true;
                } else if (v < 0 || v >= totalTiles - 1 || seen.has(v)) {
                    throw new BadRequestException(
                        `SHUFFLE_INVALID_PIECES: shuffle[${i}] must contain each tile index 0–${totalTiles - 2} exactly once`,
                    );
                } else {
                    seen.add(v);
                }
            }

            if (!hasBlank || seen.size !== totalTiles - 1) {
                throw new BadRequestException(
                    `SHUFFLE_INVALID_PIECES: shuffle[${i}] must contain each tile index 0–${totalTiles - 2} exactly once and exactly one blank (-1)`,
                );
            }

            if (isSolved(shuffle)) {
                throw new BadRequestException(
                    `SHUFFLE_ALREADY_SOLVED: shuffle[${i}] is already in the solved position`,
                );
            }

            if (!isSolvable(shuffle, gridX, gridY)) {
                throw new BadRequestException(
                    `SHUFFLE_NOT_SOLVABLE: shuffle[${i}] fails the solvability parity check`,
                );
            }
        }
    }

    /**
     * Handle create.
     *
     * @param {CreateBoardDto} dto - dto value.
     *
     * @returns {Promise<void>} Resolves when the operation completes.
     */
    async create(dto: CreateBoardDto) {
        const level = await this.prisma.level.findFirst({
            where: { id: dto.levelId, deletedAt: null },
        });
        if (!level) {
            throw new NotFoundException('LEVEL_NOT_FOUND_FOR_BOARD');
        }

        const duplicate = await this.prisma.board.findFirst({
            where: {
                levelId: dto.levelId,
                name: { equals: dto.name, mode: 'insensitive' },
                deletedAt: null,
            },
        });
        if (duplicate) {
            throw new ConflictException('BOARD_NAME_TAKEN');
        }

        this.validateShuffles(dto.shuffles, dto.gridSize.x, dto.gridSize.y);

        await this.prisma.board.create({
            data: {
                levelId: dto.levelId,
                name: dto.name,
                gridX: dto.gridSize.x,
                gridY: dto.gridSize.y,
                fullImageUrl: dto.fileUrl,
                shuffles: {
                    createMany: {
                        data: dto.shuffles.map((pieces) => ({ pieces })),
                    },
                },
            },
        });
    }

    /**
     * Handle update.
     *
     * @param {UpdateBoardDto} dto - dto value.
     *
     * @returns {Promise<void>} Resolves when the operation completes.
     */
    async update(dto: UpdateBoardDto) {
        const board = await this.prisma.board.findFirst({
            where: { id: dto.boardId, deletedAt: null },
        });
        if (!board) {
            throw new NotFoundException('BOARD_NOT_FOUND');
        }

        const duplicate = await this.prisma.board.findFirst({
            where: {
                levelId: board.levelId,
                name: { equals: dto.name, mode: 'insensitive' },
                deletedAt: null,
                id: { not: dto.boardId },
            },
        });
        if (duplicate) {
            throw new ConflictException('BOARD_NAME_TAKEN');
        }

        this.validateShuffles(dto.shuffles, dto.gridSize.x, dto.gridSize.y);

        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.board.update({
                where: { id: dto.boardId },
                data: {
                    name: dto.name,
                    gridX: dto.gridSize.x,
                    gridY: dto.gridSize.y,
                    fullImageUrl: dto.fileUrl,
                },
            }),
            this.prisma.boardShuffle.updateMany({
                where: { boardId: dto.boardId, deletedAt: null },
                data: { deletedAt: now },
            }),
            this.prisma.boardShuffle.createMany({
                data: dto.shuffles.map((pieces) => ({ boardId: dto.boardId, pieces })),
            }),
        ]);
    }

    /**
     * Handle remove.
     *
     * @param {DeleteBoardsDto} dto - dto value.
     *
     * @returns {Promise<void>} Resolves when the operation completes.
     */
    async remove(dto: DeleteBoardsDto) {
        const found = await this.prisma.board.findMany({
            where: { id: { in: dto.boardIds }, deletedAt: null },
            select: { id: true, levelId: true },
        });

        if (found.length !== dto.boardIds.length) {
            const foundIds = new Set(found.map((b) => b.id));
            const missingIds = dto.boardIds.filter((id) => !foundIds.has(id));
            if (dto.boardIds.length === 1) {
                throw new NotFoundException('BOARD_NOT_FOUND');
            }
            throw new NotFoundException({ message: 'SOME_BOARDS_NOT_FOUND', data: { missingIds } });
        }

        const affectedLevelIds = [...new Set(found.map((b) => b.levelId))];

        const [gameLevelReqs, demoLevelReqs] = await Promise.all([
            this.prisma.stageLevelConfig.groupBy({
                by: ['levelId'],
                where: {
                    levelId: { in: affectedLevelIds },
                    deletedAt: null,
                    stageConfig: { deletedAt: null },
                },
                _sum: { boardCount: true },
            }),
            this.prisma.stageDemoLevelConfig.groupBy({
                by: ['levelId'],
                where: {
                    levelId: { in: affectedLevelIds },
                    deletedAt: null,
                    stageConfig: { deletedAt: null },
                },
                _sum: { boardCount: true },
            }),
        ]);

        const requiredByLevel = new Map<string, number>();
        for (const r of gameLevelReqs) {
            requiredByLevel.set(
                r.levelId,
                (requiredByLevel.get(r.levelId) ?? 0) + (r._sum.boardCount ?? 0),
            );
        }
        for (const r of demoLevelReqs) {
            requiredByLevel.set(
                r.levelId,
                (requiredByLevel.get(r.levelId) ?? 0) + (r._sum.boardCount ?? 0),
            );
        }

        if (requiredByLevel.size > 0) {
            const remainingCounts = await this.prisma.board.groupBy({
                by: ['levelId'],
                where: {
                    levelId: { in: affectedLevelIds },
                    deletedAt: null,
                    id: { notIn: dto.boardIds },
                },
                _count: { id: true },
            });

            const remainingByLevel = new Map(
                remainingCounts.map((count) => [count.levelId, count._count.id]),
            );

            const violatingLevelIds = [...requiredByLevel.entries()]
                .filter(([levelId, required]) => (remainingByLevel.get(levelId) ?? 0) < required)
                .map(([levelId]) => levelId);

            if (violatingLevelIds.length > 0) {
                throw new ConflictException({
                    message: 'BOARD_DELETE_VIOLATES_STAGE_CONFIG',
                    data: { levelIds: violatingLevelIds },
                });
            }
        }

        await this.prisma.board.updateMany({
            where: { id: { in: dto.boardIds } },
            data: { deletedAt: new Date() },
        });
    }

    /**
     * Handle list.
     *
     * @param {ListBoardsDto} dto - dto value.
     *
     * @returns {Promise<{ data: { id: string; name: string; createdAt: Date; level: { id: string; name: string; }; gridSize: { x: number; y: number; }; }[]; totalCount: number; }>} The asynchronous result.
     */
    async list(dto: ListBoardsDto) {
        const where = {
            deletedAt: null,
            ...(dto.levelId && { levelId: dto.levelId }),
            ...(dto.search && { name: { contains: dto.search, mode: 'insensitive' as const } }),
        };

        const [boards, totalCount] = await Promise.all([
            this.prisma.board.findMany({
                where,
                skip: dto.skip,
                take: dto.limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    level: { select: { id: true, name: true } },
                },
            }),
            this.prisma.board.count({ where }),
        ]);

        const data = boards.map(({ gridX, gridY, id, name, createdAt, level }) => ({
            id,
            name,
            createdAt,
            level,
            gridSize: { x: gridX, y: gridY },
        }));

        return { data, totalCount };
    }

    /**
     * Generate solvable shuffles for a board grid.
     *
     * @param {number} gridX - grid x value.
     * @param {number} gridY - grid y value.
     * @param {number} count - count value.
     *
     * @returns {number[][]} The generated shuffle pieces.
     */
    generateShuffles(gridX: number, gridY: number, count: number): number[][] {
        const shuffles: number[][] = [];
        for (let i = 0; i < count; i++) {
            shuffles.push(generateSolvableShuffle(gridX, gridY));
        }
        return shuffles;
    }

    /**
     * Get details for a single board, including all active shuffles.
     *
     * @param {string} boardId - board id value.
     *
     * @returns {Promise<{ id: string; name: string; createdAt: Date; level: { id: string; name: string; }; gridSize: { x: number; y: number; }; fullImageUrl: string; shuffles: { id: string; pieces: number[]; createdAt: Date; }[]; }>} The asynchronous result.
     */
    async getDetails(boardId: string) {
        const board = await this.prisma.board.findFirst({
            where: { id: boardId, deletedAt: null },
            include: {
                level: { select: { id: true, name: true } },
                shuffles: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                    select: { id: true, pieces: true, createdAt: true },
                },
            },
        });
        if (!board) {
            throw new NotFoundException('BOARD_NOT_FOUND');
        }

        const { id, name, createdAt, level, gridX, gridY, fullImageUrl, shuffles } = board;
        return {
            id,
            name,
            createdAt,
            level,
            gridSize: { x: gridX, y: gridY },
            fullImageUrl,
            shuffles,
        };
    }
}
