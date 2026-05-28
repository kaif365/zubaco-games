import { PrismaService } from "@common/prisma/prisma.service";
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";

import { UpdateStageConfigDto } from "./dto/create-stage-config.dto";

@Injectable()
export class StageConfigService {
  /**
   * Create a new instance.
   *
   * @param {PrismaService} prisma - prisma value.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all stage configs.
   *
   * @returns {Promise<object[]>} All stage configs.
   */
  async findAll() {
    return this.prisma.stageConfig.findMany({
      where: { deletedAt: null },
      include: {
        levels: { where: { deletedAt: null }, include: { level: true } },
        demoLevels: { where: { deletedAt: null }, include: { level: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Find one stage config by stageId.
   *
   * @param {string} stageId - stageId value.
   *
   * @returns {Promise<object>} The stage config.
   */
  async findOne(stageId: string) {
    const config = await this.prisma.stageConfig.findFirst({
      where: { stageId, deletedAt: null },
      include: {
        levels: { where: { deletedAt: null }, include: { level: true } },
        demoLevels: { where: { deletedAt: null }, include: { level: true } },
      },
    });
    if (!config) {
      throw new NotFoundException("STAGE_CONFIG_NOT_FOUND");
    }
    return config;
  }

  /**
   * Update/Upsert a stage config (replaces levels).
   *
   * @param {UpdateStageConfigDto} dto - dto value.
   *
   * @returns {Promise<object>} The updated stage config.
   */
  async update(dto: UpdateStageConfigDto) {
    const { stageId } = dto;
    let existing = await this.prisma.stageConfig.findFirst({
      where: { stageId, deletedAt: null },
      select: { id: true, stageId: true, timeLimit: true, enableDemo: true },
    });

    // If not found, create the shell first (Upsert - Create case)
    if (!existing) {
      if (!dto.timeLimit || !dto.levels) {
        throw new ConflictException(
          "TIME_LIMIT_AND_LEVELS_REQUIRED_FOR_NEW_CONFIG",
        );
      }

      const newStage = await this.prisma.stageConfig.create({
        data: {
          stageId,
          timeLimit: dto.timeLimit,
          enableDemo: dto.enableDemo ?? false,
        },
      });
      existing = {
        id: newStage.id,
        stageId: newStage.stageId,
        timeLimit: newStage.timeLimit,
        enableDemo: newStage.enableDemo,
      };
    }

    const id = existing.id;

    // Update levels logic
    if (dto.levels) {
      for (const levelCfg of dto.levels) {
        const level = await this.prisma.level.findFirst({
          where: { id: levelCfg.levelId, deletedAt: null },
        });
        if (!level) {
          throw new NotFoundException(`LEVEL_NOT_FOUND: ${levelCfg.levelId}`);
        }
      }

      // Hard-delete existing levels ONLY for this specific stage (as requested)
      await this.prisma.stageLevelConfig.deleteMany({
        where: { stageConfigId: id },
      });

      await this.prisma.stageLevelConfig.createMany({
        data: dto.levels.map((level) => ({
          stageConfigId: id,
          levelId: level.levelId,
          boardCount: level.boardCount,
          order: level.order,
        })),
      });
    }

    // Update demo levels logic
    if (dto.demoLevels) {
      for (const levelCfg of dto.demoLevels) {
        const level = await this.prisma.level.findFirst({
          where: { id: levelCfg.levelId, deletedAt: null },
        });
        if (!level) {
          throw new NotFoundException(
            `DEMO_LEVEL_NOT_FOUND: ${levelCfg.levelId}`,
          );
        }
      }

      await this.prisma.stageDemoLevelConfig.deleteMany({
        where: { stageConfigId: id },
      });

      await this.prisma.stageDemoLevelConfig.createMany({
        data: dto.demoLevels.map((level) => ({
          stageConfigId: id,
          levelId: level.levelId,
          boardCount: level.boardCount,
          order: level.order,
        })),
      });
    }

    return this.prisma.stageConfig.update({
      where: { id },
      data: {
        timeLimit: dto.timeLimit ?? existing.timeLimit,
        enableDemo: dto.enableDemo ?? existing.enableDemo,
      },
      include: {
        levels: { where: { deletedAt: null }, include: { level: true } },
        demoLevels: { where: { deletedAt: null }, include: { level: true } },
      },
    });
  }

  /**
   * Delete a stage config by stageId.
   *
   * @param {string} stageId - stageId value.
   *
   * @returns {Promise<object>} The deleted stage config.
   */
  async remove(stageId: string) {
    const config = await this.findOne(stageId);
    return this.prisma.stageConfig.update({
      where: { id: config.id },
      data: { deletedAt: new Date() },
    });
  }
}
