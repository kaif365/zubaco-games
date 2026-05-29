import { PrismaService } from '@common/prisma/prisma.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DeleteStageConfigsDto } from './dto/delete-stage-configs.dto';
import { ListStageConfigsDto } from './dto/list-stage-configs.dto';
import { UpsertStageConfigDto } from './dto/upsert-stage-config.dto';

@Injectable()
export class StageConfigService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Validates that referenced levels exist and have enough boards for the requested counts.
     * @param {{ levelId: string; boardCount: number }[]} levels - The main level requirements.
     * @param {{ levelId: string; boardCount: number }[]} demoLevels - The demo level requirements.
     * @returns {Promise<void>} A promise that resolves when the levels are valid.
     */
    private async validateLevels(
        levels: { levelId: string; boardCount: number }[],
        demoLevels: { levelId: string; boardCount: number }[],
    ): Promise<Map<string, number>> {
        const levelIds = [...new Set([...levels, ...demoLevels].map((level) => level.levelId))];

        const found = await this.prisma.level.findMany({
            where: { id: { in: levelIds }, deletedAt: null },
            select: {
                id: true,
                difficultyScore: true,
                _count: { select: { boards: { where: { deletedAt: null } } } },
            },
        });

        if (found.length !== levelIds.length) {
            const foundIds = new Set(found.map((l) => l.id));
            const missingIds = levelIds.filter((id) => !foundIds.has(id));
            throw new NotFoundException({ message: 'SOME_LEVELS_NOT_FOUND', data: { missingIds } });
        }

        const difficultyMap = new Map(found.map((l) => [l.id, l.difficultyScore]));
        const boardCountMap = new Map(found.map((l) => [l.id, l._count.boards]));
        const requiredMap = new Map<string, number>();
        for (const level of [...levels, ...demoLevels]) {
            requiredMap.set(
                level.levelId,
                (requiredMap.get(level.levelId) ?? 0) + level.boardCount,
            );
        }

        const violations = [...requiredMap.entries()]
            .filter(([levelId, required]) => (boardCountMap.get(levelId) ?? 0) < required)
            .map(([levelId, required]) => ({
                levelId,
                required,
                available: boardCountMap.get(levelId) ?? 0,
            }));

        if (violations.length > 0) {
            throw new BadRequestException({
                message: 'INSUFFICIENT_BOARDS_FOR_LEVEL',
                data: { violations },
            });
        }

        return difficultyMap;
    }

    /**
     * Creates or updates a stage configuration and its level mappings.
     * @param {UpsertStageConfigDto} dto - The payload containing the stage configuration details.
     * @returns {Promise<void>} A promise that resolves when the stage configuration is stored.
     */
    async upsert(dto: UpsertStageConfigDto) {
        const difficultyMap = await this.validateLevels(dto.levels, dto.demoLevels);

        const sortedLevels = [...dto.levels].sort(
            (a, b) => (difficultyMap.get(a.levelId) ?? 0) - (difficultyMap.get(b.levelId) ?? 0),
        );
        const sortedDemoLevels = [...dto.demoLevels].sort(
            (a, b) => (difficultyMap.get(a.levelId) ?? 0) - (difficultyMap.get(b.levelId) ?? 0),
        );

        const totalActualRounds = sortedLevels.reduce((sum, level) => sum + level.boardCount, 0);
        const totalDemoRounds = dto.enableDemo
            ? sortedDemoLevels.reduce((sum, level) => sum + level.boardCount, 0)
            : 0;

        const existing = await this.prisma.stageConfig.findFirst({
            where: { stageId: dto.stageId, deletedAt: null },
            select: { id: true },
        });

        const now = new Date();

        if (existing) {
            // Soft-delete old level configs and replace
            await Promise.all([
                this.prisma.stageLevelConfig.updateMany({
                    where: { stageConfigId: existing.id, deletedAt: null },
                    data: { deletedAt: now },
                }),
                this.prisma.stageDemoLevelConfig.updateMany({
                    where: { stageConfigId: existing.id, deletedAt: null },
                    data: { deletedAt: now },
                }),
            ]);

            await Promise.all([
                this.prisma.stageLevelConfig.createMany({
                    data: sortedLevels.map((l, index) => ({
                        stageConfigId: existing.id,
                        levelId: l.levelId,
                        boardCount: l.boardCount,
                        order: index,
                    })),
                }),
                sortedDemoLevels.length > 0
                    ? this.prisma.stageDemoLevelConfig.createMany({
                          data: sortedDemoLevels.map((l, index) => ({
                              stageConfigId: existing.id,
                              levelId: l.levelId,
                              boardCount: l.boardCount,
                              order: index,
                          })),
                      })
                    : Promise.resolve(),
            ]);

            await this.prisma.stageConfig.update({
                where: { id: existing.id },
                data: {
                    timeLimit: dto.timeLimit,
                    enableDemo: dto.enableDemo,
                    totalActualRounds,
                    totalDemoRounds,
                },
            });
        } else {
            const stageConfig = await this.prisma.stageConfig.create({
                data: {
                    stageId: dto.stageId,
                    timeLimit: dto.timeLimit,
                    enableDemo: dto.enableDemo,
                    totalActualRounds,
                    totalDemoRounds,
                },
            });

            await Promise.all([
                this.prisma.stageLevelConfig.createMany({
                    data: sortedLevels.map((l, index) => ({
                        stageConfigId: stageConfig.id,
                        levelId: l.levelId,
                        boardCount: l.boardCount,
                        order: index,
                    })),
                }),
                sortedDemoLevels.length > 0
                    ? this.prisma.stageDemoLevelConfig.createMany({
                          data: sortedDemoLevels.map((l, index) => ({
                              stageConfigId: stageConfig.id,
                              levelId: l.levelId,
                              boardCount: l.boardCount,
                              order: index,
                          })),
                      })
                    : Promise.resolve(),
            ]);
        }
    }

    /**
     * Soft-deletes stage configurations and their level mappings.
     * @param {DeleteStageConfigsDto} dto - The payload containing the stage identifiers to delete.
     * @returns {Promise<void>} A promise that resolves when the stage configurations are deleted.
     */
    async remove(dto: DeleteStageConfigsDto) {
        const found = await this.prisma.stageConfig.findMany({
            where: { stageId: { in: dto.stageIds }, deletedAt: null },
            select: { id: true, stageId: true },
        });

        if (found.length !== dto.stageIds.length) {
            const foundIds = new Set(found.map((s) => s.stageId));
            const missingIds = dto.stageIds.filter((id) => !foundIds.has(id));
            if (dto.stageIds.length === 1) {
                throw new NotFoundException('STAGE_CONFIG_NOT_FOUND');
            }
            throw new NotFoundException({
                message: 'SOME_STAGE_CONFIGS_NOT_FOUND',
                data: { missingIds },
            });
        }

        const configIds = found.map((s) => s.id);
        const now = new Date();

        await Promise.all([
            this.prisma.stageLevelConfig.updateMany({
                where: { stageConfigId: { in: configIds } },
                data: { deletedAt: now },
            }),
            this.prisma.stageDemoLevelConfig.updateMany({
                where: { stageConfigId: { in: configIds } },
                data: { deletedAt: now },
            }),
        ]);

        await this.prisma.stageConfig.updateMany({
            where: { id: { in: configIds } },
            data: { deletedAt: now },
        });
    }

    /**
     * Lists stage configurations with level and demo-level details.
     * @param {ListStageConfigsDto} dto - The query payload containing paging and filter values.
     * @returns {Promise<{ data: unknown[]; totalCount: number }>} The paginated stage configuration list.
     */
    async list(dto: ListStageConfigsDto) {
        const where = {
            deletedAt: null,
            ...(dto.stageId && { stageId: dto.stageId }),
        };

        const [stageConfigs, totalCount] = await Promise.all([
            this.prisma.stageConfig.findMany({
                where,
                skip: dto.skip,
                take: dto.limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    stageId: true,
                    timeLimit: true,
                    enableDemo: true,
                    createdAt: true,
                    levels: {
                        where: { deletedAt: null },
                        orderBy: { order: 'asc' },
                        select: {
                            id: true,
                            boardCount: true,
                            order: true,
                            level: { select: { id: true, name: true } },
                        },
                    },
                    demoLevels: {
                        where: { deletedAt: null },
                        orderBy: { order: 'asc' },
                        select: {
                            id: true,
                            boardCount: true,
                            order: true,
                            level: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
            this.prisma.stageConfig.count({ where }),
        ]);

        const data = stageConfigs.map(({ levels, demoLevels, ...cfg }) => ({
            ...cfg,
            levels: levels.map(({ level, ...l }) => ({ ...l, level })),
            demoLevels: demoLevels.map(({ level, ...l }) => ({ ...l, level })),
        }));

        return { data, totalCount };
    }
}
