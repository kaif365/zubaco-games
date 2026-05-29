import { GAME_TYPES } from '@common/constants';
import { PrismaService } from '@common/prisma/prisma.service';
import {
    BlockFillBoardShape,
    colorCodeToStorageValue,
    extractPairsFromBoardShape,
    formatSharedBoardDefinition,
    normalizeColorCode,
    toBoardShape,
    toStoredBoardShape,
} from '@common/utils/block-fill-board.util';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma';

import { validateBlockFillPairs } from '../../game/utils/block-fill-validator';

import { CreateBoardDto } from './dto/create-board.dto';
import { DeleteBoardsDto } from './dto/delete-boards.dto';
import { ListBoardsDto } from './dto/list-boards.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { ValidateBoardDto } from './dto/validate-board.dto';

@Injectable()
export class BoardService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Creates a new block-fill board under a level.
     * @param {CreateBoardDto} dto - The payload containing the board details.
     * @returns {Promise<unknown>} The created board in shared response format.
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

        this.assertValidBoard(dto);
        const boardShape = toStoredBoardShape({
            name: dto.name,
            gridRow: dto.gridRow,
            gridCol: dto.gridCol,
            nodes: dto.nodes,
        });

        const board = await this.prisma.board.create({
            data: {
                levelId: dto.levelId,
                name: dto.name,
                gameType: GAME_TYPES.BLOCK_FILL,
                gridX: dto.gridCol,
                gridY: dto.gridRow,
                pairs: boardShape as unknown as Prisma.InputJsonValue,
            },
        });

        return this.formatBoardRecord(board);
    }

    /**
     * Validates a board payload without persisting it.
     * @param {ValidateBoardDto} dto - The payload containing the board definition.
     * @returns {{ valid: boolean }} The validation result.
     */
    validate(dto: ValidateBoardDto) {
        this.assertValidBoard(dto);
        return { valid: true };
    }

    /**
     * Updates an existing block-fill board.
     * @param {UpdateBoardDto} dto - The payload containing the updated board details.
     * @returns {Promise<unknown>} The updated board in shared response format.
     */
    async update(dto: UpdateBoardDto) {
        const board = await this.prisma.board.findFirst({
            where: { id: dto.boardId, deletedAt: null },
        });
        if (!board) {
            throw new NotFoundException('BOARD_NOT_FOUND');
        }

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
                id: { not: dto.boardId },
            },
        });
        if (duplicate) {
            throw new ConflictException('BOARD_NAME_TAKEN');
        }

        this.assertValidBoard(dto);
        const boardShape = toStoredBoardShape({
            name: dto.name,
            gridRow: dto.gridRow,
            gridCol: dto.gridCol,
            nodes: dto.nodes,
        });

        const updatedBoard = await this.prisma.board.update({
            where: { id: dto.boardId },
            data: {
                levelId: dto.levelId,
                name: dto.name,
                gameType: GAME_TYPES.BLOCK_FILL,
                gridX: dto.gridCol,
                gridY: dto.gridRow,
                pairs: boardShape as unknown as Prisma.InputJsonValue,
            },
        });

        return this.formatBoardRecord(updatedBoard);
    }

    /**
     * Soft-deletes one or more boards after dependency checks.
     * @param {DeleteBoardsDto} dto - The payload containing the board identifiers to delete.
     * @returns {Promise<unknown>} The Prisma update summary for the soft-delete operation.
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

        const [stageLevelRequirements, demoLevelRequirements] = await Promise.all([
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
        for (const requirement of stageLevelRequirements) {
            requiredByLevel.set(
                requirement.levelId,
                (requiredByLevel.get(requirement.levelId) ?? 0) +
                    (requirement._sum.boardCount ?? 0),
            );
        }
        for (const requirement of demoLevelRequirements) {
            requiredByLevel.set(
                requirement.levelId,
                (requiredByLevel.get(requirement.levelId) ?? 0) +
                    (requirement._sum.boardCount ?? 0),
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

            const remainingByLevel = new Map(remainingCounts.map((r) => [r.levelId, r._count.id]));
            const violations = [...requiredByLevel.entries()]
                .filter(([levelId, required]) => (remainingByLevel.get(levelId) ?? 0) < required)
                .map(([levelId]) => ({ levelId }));

            if (violations.length > 0) {
                throw new ConflictException({
                    message: 'BOARD_DELETE_VIOLATES_STAGE_CONFIG',
                    data: { levelIds: violations.map((v) => v.levelId) },
                });
            }
        }

        return this.prisma.board.updateMany({
            where: { id: { in: dto.boardIds } },
            data: { deletedAt: new Date() },
        });
    }

    /**
     * Lists boards using level, grid, and search filters.
     * @param {ListBoardsDto} dto - The query payload containing paging and filter values.
     * @returns {Promise<{ data: unknown[]; totalCount: number }>} The paginated board list.
     */
    async list(dto: ListBoardsDto) {
        const where = {
            deletedAt: null,
            ...(dto.levelId && { levelId: dto.levelId }),
            ...(dto.gridCol && { gridX: dto.gridCol }),
            ...(dto.gridRow && { gridY: dto.gridRow }),
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

        const data = boards.map((board) => this.formatBoardRecord(board));

        return { data, totalCount };
    }

    /**
     * Fetches a single board with its level details.
     * @param {string} boardId - The board identifier.
     * @returns {Promise<unknown>} The formatted board details.
     */
    async getDetails(boardId: string) {
        const board = await this.prisma.board.findFirst({
            where: { id: boardId, deletedAt: null },
            include: {
                level: { select: { id: true, name: true } },
            },
        });
        if (!board) {
            throw new NotFoundException('BOARD_NOT_FOUND');
        }

        return this.formatBoardRecord(board);
    }

    /**
     * Validates a board shape and its endpoint pairs.
     * @param {{ gridRow: number; gridCol: number; nodes: BlockFillBoardShape['nodes']; }} dto - The board shape payload to validate.
     * @returns {void} Nothing.
     */
    private assertValidBoard(dto: {
        gridRow: number;
        gridCol: number;
        nodes: BlockFillBoardShape['nodes'];
    }) {
        for (const node of dto.nodes) {
            try {
                colorCodeToStorageValue(
                    normalizeColorCode(node.colorCode ?? String(node.color ?? '')),
                );
            } catch {
                throw new ConflictException(
                    `UNSUPPORTED_COLOR_CODE: ${node.colorCode ?? String(node.color ?? '')}`,
                );
            }
        }

        const pairs = extractPairsFromBoardShape({
            name: 'validation-board',
            gridRow: dto.gridRow,
            gridCol: dto.gridCol,
            nodes: dto.nodes,
        });

        validateBlockFillPairs(dto.gridCol, dto.gridRow, pairs);
    }

    private getBoardShape(options: {
        name: string | null;
        gridX: number;
        gridY: number;
        pairs: unknown;
    }) {
        return toBoardShape({
            name: options.name,
            gridX: options.gridX,
            gridY: options.gridY,
            rawPairs: options.pairs,
        });
    }

    private formatBoardRecord(board: {
        id: string;
        levelId: string;
        level?: { id: string; name: string } | null;
        name: string | null;
        gridX: number;
        gridY: number;
        pairs: unknown;
    }) {
        const boardShape = this.getBoardShape({
            name: board.name,
            gridX: board.gridX,
            gridY: board.gridY,
            pairs: board.pairs,
        });

        const sharedBoardDefinition = formatSharedBoardDefinition({
            levelId: board.levelId,
            boardShape,
        });
        const { levelId, ...sharedDef } = sharedBoardDefinition;
        void levelId;

        return {
            id: board.id,
            ...sharedDef,
            ...(board.level && { level: { id: board.level.id, name: board.level.name } }),
        };
    }
}
