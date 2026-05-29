import { PrismaService } from "@common/prisma/prisma.service";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { CreateLevelDto } from "./dto/create-level.dto";
import { DeleteLevelsDto } from "./dto/delete-levels.dto";
import { ListLevelsDto } from "./dto/list-levels.dto";
import { UpdateLevelDto } from "./dto/update-level.dto";

@Injectable()
export class LevelService {
  /**
   * Create a new instance.
   *
   * @param {PrismaService} prisma - prisma value.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle create.
   *
   * @param {CreateLevelDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async create(dto: CreateLevelDto) {
    const duplicate = await this.prisma.level.findFirst({
      where: {
        name: { equals: dto.name, mode: "insensitive" },
        deletedAt: null,
      },
    });
    if (duplicate) {
      throw new ConflictException("LEVEL_NAME_TAKEN");
    }

    await this.prisma.level.create({ data: { name: dto.name } });
  }

  /**
   * Handle update.
   *
   * @param {UpdateLevelDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async update(dto: UpdateLevelDto) {
    const level = await this.prisma.level.findFirst({
      where: { id: dto.levelId, deletedAt: null },
    });
    if (!level) {
      throw new NotFoundException("LEVEL_NOT_FOUND");
    }

    const duplicate = await this.prisma.level.findFirst({
      where: {
        name: { equals: dto.name, mode: "insensitive" },
        deletedAt: null,
        id: { not: dto.levelId },
      },
    });
    if (duplicate) {
      throw new ConflictException("LEVEL_NAME_TAKEN");
    }

    await this.prisma.level.update({
      where: { id: dto.levelId },
      data: { name: dto.name },
    });
  }

  /**
   * Handle remove.
   *
   * @param {DeleteLevelsDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async remove(dto: DeleteLevelsDto) {
    const found = await this.prisma.level.findMany({
      where: { id: { in: dto.levelIds }, deletedAt: null },
      select: { id: true },
    });

    if (found.length !== dto.levelIds.length) {
      const foundIds = new Set(found.map((level) => level.id));
      const missingIds = dto.levelIds.filter((id) => !foundIds.has(id));

      if (dto.levelIds.length === 1) {
        throw new NotFoundException("LEVEL_NOT_FOUND");
      }
      throw new NotFoundException({
        message: "SOME_LEVELS_NOT_FOUND",
        data: { missingIds },
      });
    }

    // Check no active stage configs reference these levels (normal or demo)
    const [stageConfigUsage, demoConfigUsage] = await Promise.all([
      this.prisma.stageLevelConfig.findFirst({
        where: {
          levelId: { in: dto.levelIds },
          stageConfig: { deletedAt: null },
        },
        select: { levelId: true },
      }),
      this.prisma.stageDemoLevelConfig.findFirst({
        where: {
          levelId: { in: dto.levelIds },
          stageConfig: { deletedAt: null },
        },
        select: { levelId: true },
      }),
    ]);
    if (stageConfigUsage || demoConfigUsage) {
      throw new ConflictException("LEVEL_IN_USE_BY_STAGE_CONFIG");
    }

    await this.prisma.level.updateMany({
      where: { id: { in: dto.levelIds } },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Handle list.
   *
   * @param {ListLevelsDto} dto - dto value.
   *
   * @returns {Promise<{ data: { id: string; name: string; createdAt: Date; }[]; totalCount: number; }>} The asynchronous result.
   */
  async list(dto: ListLevelsDto) {
    const where = {
      deletedAt: null,
      ...(dto.search && {
        name: { contains: dto.search, mode: "insensitive" as const },
      }),
    };

    const [data, totalCount] = await Promise.all([
      this.prisma.level.findMany({
        where,
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, createdAt: true },
      }),
      this.prisma.level.count({ where }),
    ]);

    return { data, totalCount };
  }
}
