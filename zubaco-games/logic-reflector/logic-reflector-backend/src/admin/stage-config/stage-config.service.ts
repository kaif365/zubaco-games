import { PrismaService } from "@common/prisma/prisma.service";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { DeleteStageConfigsDto } from "./dto/delete-stage-configs.dto";
import { ListStageConfigsDto } from "./dto/list-stage-configs.dto";
import { UpsertStageConfigDto } from "./dto/upsert-stage-config.dto";

@Injectable()
export class StageConfigService {
  /**
   * Create a new instance.
   *
   * @param {PrismaService} prisma - prisma value.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate levels.
   *
   * @param {{ levelId: string; boardCount: number }[]} levels - levels value.
   * @param {{ levelId: string; boardCount: number }[]} demoLevels - demo levels value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  private async validateLevels(
    levels: { levelId: string; boardCount: number }[],
    demoLevels: { levelId: string; boardCount: number }[],
  ) {
    const allLevelIds = [
      ...new Set([...levels, ...demoLevels].map((level) => level.levelId)),
    ];

    const found = await this.prisma.level.findMany({
      where: { id: { in: allLevelIds }, deletedAt: null },
      select: {
        id: true,
        _count: { select: { boards: { where: { deletedAt: null } } } },
      },
    });

    if (found.length !== allLevelIds.length) {
      const foundIds = new Set(found.map((level) => level.id));
      const missingIds = allLevelIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException({
        message: "SOME_LEVELS_NOT_FOUND",
        data: { missingIds },
      });
    }

    const availableMap = new Map(
      found.map((level) => [level.id, level._count.boards]),
    );

    const requiredMap = new Map<string, number>();
    for (const level of [...levels, ...demoLevels]) {
      requiredMap.set(
        level.levelId,
        (requiredMap.get(level.levelId) ?? 0) + level.boardCount,
      );
    }

    const violations: {
      levelId: string;
      required: number;
      available: number;
    }[] = [];
    for (const [levelId, required] of requiredMap) {
      const available = availableMap.get(levelId) ?? 0;
      if (available < required) {
        violations.push({ levelId, required, available });
      }
    }

    if (violations.length > 0) {
      throw new BadRequestException({
        message: "INSUFFICIENT_BOARDS_FOR_LEVEL",
        data: { violations },
      });
    }
  }

  /**
   * Handle upsert.
   *
   * @param {UpsertStageConfigDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async upsert(dto: UpsertStageConfigDto) {
    await this.validateLevels(dto.levels, dto.demoLevels);

    const existing = await this.prisma.stageConfig.findFirst({
      where: { stageId: dto.stageId, deletedAt: null },
      select: { id: true },
    });

    const now = new Date();

    if (existing) {
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
          data: dto.levels.map((l, i) => ({
            stageConfigId: existing.id,
            levelId: l.levelId,
            boardCount: l.boardCount,
            order: i,
          })),
        }),
        dto.demoLevels.length > 0 &&
          this.prisma.stageDemoLevelConfig.createMany({
            data: dto.demoLevels.map((l, i) => ({
              stageConfigId: existing.id,
              levelId: l.levelId,
              boardCount: l.boardCount,
              order: i,
            })),
          }),
      ]);

      await this.prisma.stageConfig.update({
        where: { id: existing.id },
        data: { timeLimit: dto.timeLimit, enableDemo: dto.enableDemo },
      });
    } else {
      const stageConfig = await this.prisma.stageConfig.create({
        data: {
          stageId: dto.stageId,
          timeLimit: dto.timeLimit,
          enableDemo: dto.enableDemo,
        },
      });

      await Promise.all([
        this.prisma.stageLevelConfig.createMany({
          data: dto.levels.map((l, i) => ({
            stageConfigId: stageConfig.id,
            levelId: l.levelId,
            boardCount: l.boardCount,
            order: i,
          })),
        }),
        dto.demoLevels.length > 0 &&
          this.prisma.stageDemoLevelConfig.createMany({
            data: dto.demoLevels.map((l, i) => ({
              stageConfigId: stageConfig.id,
              levelId: l.levelId,
              boardCount: l.boardCount,
              order: i,
            })),
          }),
      ]);
    }
  }

  /**
   * Handle remove.
   *
   * @param {DeleteStageConfigsDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async remove(dto: DeleteStageConfigsDto) {
    const found = await this.prisma.stageConfig.findMany({
      where: { stageId: { in: dto.stageIds }, deletedAt: null },
      select: { id: true, stageId: true },
    });

    if (found.length !== dto.stageIds.length) {
      const foundIds = new Set(found.map((stageConfig) => stageConfig.stageId));
      const missingIds = dto.stageIds.filter((id) => !foundIds.has(id));
      if (dto.stageIds.length === 1) {
        throw new NotFoundException("STAGE_CONFIG_NOT_FOUND");
      }
      throw new NotFoundException({
        message: "SOME_STAGE_CONFIGS_NOT_FOUND",
        data: { missingIds },
      });
    }

    const configIds = found.map((stageConfig) => stageConfig.id);
    const now = new Date();

    await this.prisma.stageLevelConfig.updateMany({
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
   * @returns {Promise<object>} The asynchronous result.
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
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          stageId: true,
          timeLimit: true,
          enableDemo: true,
          createdAt: true,
          levels: {
            where: { deletedAt: null },
            orderBy: { order: "asc" },
            select: {
              id: true,
              boardCount: true,
              order: true,
              level: { select: { id: true, name: true } },
            },
          },
          demoLevels: {
            where: { deletedAt: null },
            orderBy: { order: "asc" },
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
