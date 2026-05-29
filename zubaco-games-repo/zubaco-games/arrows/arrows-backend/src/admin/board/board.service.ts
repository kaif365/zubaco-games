import { DIR_TO_STRING, STRING_TO_DIR } from '@common/constants';
import { PrismaService } from '@common/prisma/prisma.service';
import {
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';

import { CreateBoardDto } from './dto/create-board.dto';
import { DeleteBoardsDto } from './dto/delete-boards.dto';
import { ListBoardsDto } from './dto/list-boards.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { generateEscapeLevel } from './escape-level.generator';

@Injectable()
export class BoardService {
    /**
     * Create a new instance.
     *
     * @param {PrismaService} prisma - prisma value.
     */
    constructor(private readonly prisma: PrismaService) {}

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

        const board = await this.prisma.board.create({
            data: {
                levelId: dto.levelId,
                name: dto.name,
                gridX: dto.gridSize.x,
                gridY: dto.gridSize.y,
            },
        });

        await this.prisma.arrow.createMany({
            data: dto.arrows.map((a, i) => ({
                boardId: board.id,
                color: a.color,
                headDirection: STRING_TO_DIR[a.headDirection],
                waypoints: a.waypoints,
                sortOrder: i,
            })),
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

        await this.prisma.arrow.updateMany({
            where: { boardId: dto.boardId, deletedAt: null },
            data: { deletedAt: new Date() },
        });

        await this.prisma.arrow.createMany({
            data: dto.arrows.map((a, i) => ({
                boardId: dto.boardId,
                color: a.color,
                headDirection: STRING_TO_DIR[a.headDirection],
                waypoints: a.waypoints,
                sortOrder: i,
            })),
        });

        await this.prisma.board.update({
            where: { id: dto.boardId },
            data: { name: dto.name, gridX: dto.gridSize.x, gridY: dto.gridSize.y },
        });
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

        // Check board deletion won't violate stage config board counts
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

        // Sum game + demo boardCount per levelId
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

        const now = new Date();
        await this.prisma.arrow.updateMany({
            where: { boardId: { in: dto.boardIds }, deletedAt: null },
            data: { deletedAt: now },
        });

        await this.prisma.board.updateMany({
            where: { id: { in: dto.boardIds } },
            data: { deletedAt: now },
        });
    }

    /**
     * Handle list.
     *
     * @param {ListBoardsDto} dto - dto value.
     *
     * @returns {Promise<{ data: { id: string; name: string | null; createdAt: Date; level: { id: string; name: string; }; gridSize: { x: number; y: number; }; arrowCount: number; }[]; totalCount: number; }>} The asynchronous result.
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
                    _count: { select: { arrows: { where: { deletedAt: null } } } },
                },
            }),
            this.prisma.board.count({ where }),
        ]);

        const data = boards.map(({ _count, gridX, gridY, id, name, createdAt, level }) => ({
            id,
            name,
            createdAt,
            level,
            gridSize: { x: gridX, y: gridY },
            arrowCount: _count.arrows,
        }));

        return { data, totalCount };
    }

    /**
     * Handle generate.
     *
     * @param {number} gridX - grid x value.
     * @param {number} gridY - grid y value.
     *
     * @returns {{ gridSize: { x: number; y: number; }; arrows: ArrowDef[]; }} The generate result.
     */
    generate(gridX: number, gridY: number) {
        const arrows = generateEscapeLevel(gridX, gridY);
        if (arrows) {
            return { gridSize: { x: gridX, y: gridY }, arrows };
        }
        throw new InternalServerErrorException('PUZZLE_GENERATION_FAILED');
    }

    /**
     * Get details.
     *
     * @param {string} boardId - board id value.
     *
     * @returns {Promise<{ id: string; name: string | null; createdAt: Date; level: { id: string; name: string; }; gridSize: { x: number; y: number; }; arrows: { id: string; boardId: string; color: number; waypoints: JsonValue; sortOrder: number; headDirection: string; }[]; }>} The asynchronous result.
     */
    async getDetails(boardId: string) {
        const board = await this.prisma.board.findFirst({
            where: { id: boardId, deletedAt: null },
            include: {
                level: { select: { id: true, name: true } },
                arrows: {
                    where: { deletedAt: null },
                    orderBy: { sortOrder: 'asc' },
                },
            },
        });
        if (!board) {
            throw new NotFoundException('BOARD_NOT_FOUND');
        }

        const { id, name, createdAt, level, gridX, gridY, arrows } = board;
        return {
            id,
            name,
            createdAt,
            level,
            gridSize: { x: gridX, y: gridY },
            arrows: arrows.map(({ id, boardId, color, waypoints, sortOrder, headDirection }) => ({
                id,
                boardId,
                color,
                waypoints,
                sortOrder,
                headDirection: DIR_TO_STRING[headDirection] ?? headDirection,
            })),
        };
    }
}
