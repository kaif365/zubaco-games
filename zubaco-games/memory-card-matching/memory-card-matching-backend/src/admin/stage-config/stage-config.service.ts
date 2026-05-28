import { PrismaService } from "@common/prisma/prisma.service";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Difficulty, Level, Prisma } from "@prisma/client";

import { LevelService } from "../level/level.service";

import type { DeleteStageConfigsDto } from "./dto/delete-stage-configs.dto";
import type { ListStageConfigsDto } from "./dto/list-stage-configs.dto";
import type { UpsertStageConfigDto } from "./dto/upsert-stage-config.dto";

export interface ResolvedStageDifficultyConfig {
  id: string;
  difficultyId: string;
  boardCount: number;
  order: number;
  difficulty: Difficulty;
}

export interface ResolvedStageDemoDifficultyConfig {
  id: string;
  difficultyId: string;
  boardCount: number;
  order: number;
  difficulty: Difficulty;
}

export interface ResolvedStageConfig {
  id: string;
  stageId: string;
  gameTimeLimitSeconds: number;
  enableDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  levels: Level[];
  levelConfigs: ResolvedStageDifficultyConfig[];
  demoLevels: Level[];
  demoLevelConfigs: ResolvedStageDemoDifficultyConfig[];
}

/**
 * Manages admin CRUD operations and runtime resolution for stage configs.
 */
@Injectable()
export class StageConfigService {
  /**
   * Create a new instance.
   *
   * @param {PrismaService} prisma - prisma value.
   * @param {LevelService} levelService - level service value.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly levelService: LevelService,
  ) {}

  /**
   * Handle upsert.
   *
   * @param {UpsertStageConfigDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async upsert(dto: UpsertStageConfigDto): Promise<void> {
    const difficultyScoreMap = await this.validateDifficultyLevels(
      dto.levels,
      dto.demoLevels,
    );

    const sortedLevels = [...dto.levels].sort(
      (a, b) =>
        (difficultyScoreMap.get(a.difficultyId) ?? 0) -
        (difficultyScoreMap.get(b.difficultyId) ?? 0),
    );
    const sortedDemoLevels = [...dto.demoLevels].sort(
      (a, b) =>
        (difficultyScoreMap.get(a.difficultyId) ?? 0) -
        (difficultyScoreMap.get(b.difficultyId) ?? 0),
    );

    const existing = await this.prisma.stageConfig.findUnique({
      where: { stageId: dto.stageId },
      select: { id: true },
    });

    const now = new Date();

    if (existing) {
      await this.prisma.stageConfigLevel.updateMany({
        where: {
          stageConfigId: existing.id,
          deletedAt: null,
        },
        data: { deletedAt: now },
      });
      await this.prisma.stageDemoConfigLevel.updateMany({
        where: {
          stageConfigId: existing.id,
          deletedAt: null,
        },
        data: { deletedAt: now },
      });

      await this.prisma.stageConfig.update({
        where: { id: existing.id },
        data: {
          gameTimeLimitSeconds: dto.timeLimit,
          enableDemo: dto.enableDemo,
          isEnabled: true,
          deletedAt: null,
          levels: {
            create: sortedLevels.map((level, index) => ({
              difficultyId: level.difficultyId,
              boardCount: level.boardCount,
              order: index,
            })),
          },
          demoLevels: {
            create: sortedDemoLevels.map((level, index) => ({
              difficultyId: level.difficultyId,
              boardCount: level.boardCount,
              order: index,
            })),
          },
        },
      });
      return;
    }

    await this.prisma.stageConfig.create({
      data: {
        stageId: dto.stageId,
        gameTimeLimitSeconds: dto.timeLimit,
        enableDemo: dto.enableDemo,
        isEnabled: true,
        levels: {
          create: sortedLevels.map((level, index) => ({
            difficultyId: level.difficultyId,
            boardCount: level.boardCount,
            order: index,
          })),
        },
        demoLevels: {
          create: sortedDemoLevels.map((level, index) => ({
            difficultyId: level.difficultyId,
            boardCount: level.boardCount,
            order: index,
          })),
        },
      },
    });
  }

  /**
   * Handle remove.
   *
   * @param {DeleteStageConfigsDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async remove(dto: DeleteStageConfigsDto): Promise<void> {
    const found = await this.prisma.stageConfig.findMany({
      where: {
        stageId: { in: dto.stageIds },
        deletedAt: null,
      },
      select: { id: true, stageId: true },
    });

    if (found.length !== dto.stageIds.length) {
      if (dto.stageIds.length === 1) {
        throw new NotFoundException("STAGE_CONFIG_NOT_FOUND");
      }

      const foundIds = new Set(found.map((config) => config.stageId));
      const missingIds = dto.stageIds.filter(
        (stageId) => !foundIds.has(stageId),
      );

      throw new NotFoundException({
        message: "SOME_STAGE_CONFIGS_NOT_FOUND",
        data: { missingIds },
      });
    }

    const configIds = found.map((config) => config.id);
    const now = new Date();

    await this.prisma.stageConfigLevel.updateMany({
      where: { stageConfigId: { in: configIds } },
      data: { deletedAt: now },
    });
    await this.prisma.stageDemoConfigLevel.updateMany({
      where: { stageConfigId: { in: configIds } },
      data: { deletedAt: now },
    });

    await this.prisma.stageConfig.updateMany({
      where: { id: { in: configIds } },
      data: { deletedAt: now },
    });
  }

  /**
   * Handle list.
   *
   * @param {ListStageConfigsDto} dto - dto value.
   *
   * @returns {Promise<{ data: Array<Omit<ResolvedStageConfig, "levels">>; totalCount: number }>} The asynchronous result.
   */
  async list(dto: ListStageConfigsDto) {
    const where: Prisma.StageConfigWhereInput = {
      deletedAt: null,
      ...(dto.stageId ? { stageId: dto.stageId } : {}),
    };

    const [stageConfigs, totalCount] = await Promise.all([
      this.prisma.stageConfig.findMany({
        where,
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          stageId: true,
          gameTimeLimitSeconds: true,
          enableDemo: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          levels: {
            where: { deletedAt: null },
            orderBy: { order: "asc" },
            select: {
              id: true,
              difficultyId: true,
              boardCount: true,
              order: true,
              difficulty: {
                select: {
                  id: true,
                  name: true,
                  createdAt: true,
                  updatedAt: true,
                  deletedAt: true,
                },
              },
            },
          },
          demoLevels: {
            where: { deletedAt: null },
            orderBy: { order: "asc" },
            select: {
              id: true,
              difficultyId: true,
              boardCount: true,
              order: true,
              difficulty: {
                select: {
                  id: true,
                  name: true,
                  createdAt: true,
                  updatedAt: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.stageConfig.count({ where }),
    ]);

    return {
      data: stageConfigs.map(
        ({
          gameTimeLimitSeconds,
          levels,
          demoLevels,
          ...stageConfig
        }): {
          id: string;
          stageId: string;
          enableDemo: boolean;
          createdAt: Date;
          updatedAt: Date;
          deletedAt: Date | null;
          timeLimit: number;
          levels: Array<{
            id: string;
            difficultyId: string;
            boardCount: number;
            order: number;
            difficulty: {
              id: string;
              name: string;
              createdAt: Date;
              updatedAt: Date;
              deletedAt: Date | null;
            };
          }>;
          demoLevels: Array<{
            id: string;
            difficultyId: string;
            boardCount: number;
            order: number;
            difficulty: {
              id: string;
              name: string;
              createdAt: Date;
              updatedAt: Date;
              deletedAt: Date | null;
            };
          }>;
        } => ({
          ...stageConfig,
          timeLimit: gameTimeLimitSeconds,
          levels,
          demoLevels,
        }),
      ),
      totalCount,
    };
  }

  /**
   * Handle get resolved stage config.
   *
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<ResolvedStageConfig>} The asynchronous result.
   */
  async getResolvedStageConfig(stageId: string): Promise<ResolvedStageConfig> {
    const stageConfig = await this.prisma.stageConfig.findFirst({
      where: {
        stageId,
        deletedAt: null,
        isEnabled: true,
      },
      select: {
        id: true,
        stageId: true,
        gameTimeLimitSeconds: true,
        enableDemo: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        levels: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          select: {
            id: true,
            difficultyId: true,
            boardCount: true,
            order: true,
            difficulty: true,
          },
        },
        demoLevels: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          select: {
            id: true,
            difficultyId: true,
            boardCount: true,
            order: true,
            difficulty: true,
          },
        },
      },
    });

    if (!stageConfig) {
      throw new NotFoundException("ACTIVE_STAGE_CONFIG_NOT_FOUND");
    }

    const difficultyIds = [
      ...new Set(
        [...stageConfig.levels, ...stageConfig.demoLevels].map(
          (level) => level.difficultyId,
        ),
      ),
    ];
    const poolByDifficulty =
      await this.levelService.listConfiguredPoolByDifficulty(difficultyIds);

    const demoLevels = this.resolveConfiguredLevels(
      stageConfig.demoLevels,
      poolByDifficulty,
      new Map(),
    );
    const levels = this.resolveConfiguredLevels(
      stageConfig.levels,
      poolByDifficulty,
      stageConfig.enableDemo
        ? this.buildOffsets(stageConfig.demoLevels)
        : new Map<string, number>(),
    );

    return {
      ...stageConfig,
      levels,
      levelConfigs: stageConfig.levels,
      demoLevels,
      demoLevelConfigs: stageConfig.demoLevels,
    };
  }

  /**
   * Handle get resolved demo stage config.
   *
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<ResolvedStageConfig>} The asynchronous result.
   */
  async getResolvedDemoStageConfig(
    stageId: string,
  ): Promise<ResolvedStageConfig> {
    return this.getResolvedStageConfig(stageId);
  }

  /**
   * Handle validate difficulty levels.
   *
   * @param {{ difficultyId: string; boardCount: number }[]} levels - levels value.
   *
   * @returns {Promise<Map<string, number>>} Map of difficultyId to difficultyScore.
   */
  private async validateDifficultyLevels(
    levels: Array<{ difficultyId: string; boardCount: number }>,
    demoLevels: Array<{ difficultyId: string; boardCount: number }> = [],
  ): Promise<Map<string, number>> {
    const difficultyIds = [
      ...new Set([...levels, ...demoLevels].map((level) => level.difficultyId)),
    ];
    const difficulties = await this.prisma.difficulty.findMany({
      where: {
        id: { in: difficultyIds },
        deletedAt: null,
      },
      select: { id: true, difficultyScore: true },
    });

    if (difficulties.length !== difficultyIds.length) {
      const foundIds = new Set(difficulties.map((difficulty) => difficulty.id));
      const missingIds = difficultyIds.filter((id) => !foundIds.has(id));

      throw new NotFoundException({
        message: "SOME_DIFFICULTIES_NOT_FOUND",
        data: { missingIds },
      });
    }

    const difficultyScoreMap = new Map(
      difficulties.map((d) => [d.id, d.difficultyScore]),
    );

    const poolByDifficulty =
      await this.levelService.listConfiguredPoolByDifficulty(difficultyIds);

    const requiredByDifficulty = [...levels, ...demoLevels].reduce(
      (map, level) => {
        map.set(
          level.difficultyId,
          (map.get(level.difficultyId) ?? 0) + level.boardCount,
        );
        return map;
      },
      new Map<string, number>(),
    );

    const violations = [...requiredByDifficulty.entries()]
      .map(([difficultyId, required]) => ({
        difficultyId,
        required,
        available: poolByDifficulty.get(difficultyId)?.length ?? 0,
      }))
      .filter((level) => level.available < level.required);

    if (violations.length > 0) {
      throw new BadRequestException({
        message: "INSUFFICIENT_LEVELS_FOR_DIFFICULTY",
        data: { violations },
      });
    }

    return difficultyScoreMap;
  }

  /**
   * Build per-difficulty offsets for subsequent level selection.
   *
   * @param {{ difficultyId: string; boardCount: number }[]} levels - configured levels value.
   *
   * @returns {Map<string, number>} The offsets map.
   */
  private buildOffsets(
    levels: Array<{ difficultyId: string; boardCount: number }>,
  ): Map<string, number> {
    return levels.reduce((map, level) => {
      map.set(
        level.difficultyId,
        (map.get(level.difficultyId) ?? 0) + level.boardCount,
      );
      return map;
    }, new Map<string, number>());
  }

  /**
   * Resolve concrete source levels from ordered difficulty configs.
   *
   * @param {{ difficultyId: string; boardCount: number }[]} configs - config rows value.
   * @param {Map<string, Level[]>} poolByDifficulty - available level pool keyed by difficulty.
   * @param {Map<string, number>} initialOffsets - already-consumed counts per difficulty.
   *
   * @returns {Level[]} The resolved levels result.
   */
  private resolveConfiguredLevels(
    configs: Array<{ difficultyId: string; boardCount: number }>,
    poolByDifficulty: Map<string, Level[]>,
    initialOffsets: Map<string, number>,
  ): Level[] {
    const offsets = new Map(initialOffsets);

    return configs.flatMap((levelConfig) => {
      const pool = poolByDifficulty.get(levelConfig.difficultyId) ?? [];
      const start = offsets.get(levelConfig.difficultyId) ?? 0;
      const end = start + levelConfig.boardCount;

      if (pool.length < end) {
        throw new BadRequestException({
          message: "INSUFFICIENT_LEVELS_FOR_DIFFICULTY",
          data: {
            difficultyId: levelConfig.difficultyId,
            required: end,
            available: pool.length,
          },
        });
      }

      const selected = pool.slice(start, start + levelConfig.boardCount);
      offsets.set(levelConfig.difficultyId, end);
      return selected;
    });
  }
}
