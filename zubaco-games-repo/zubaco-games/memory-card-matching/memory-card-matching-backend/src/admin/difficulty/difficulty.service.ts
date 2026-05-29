import { PrismaService } from "@common/prisma/prisma.service";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { CreateDifficultyDto } from "./dto/create-difficulty.dto";
import { DeleteDifficultiesDto } from "./dto/delete-difficulties.dto";
import { ListDifficultiesDto } from "./dto/list-difficulties.dto";
import { UpdateDifficultyDto } from "./dto/update-difficulty.dto";

/**
 * Manages admin CRUD operations for memory-card difficulty buckets.
 */
@Injectable()
export class DifficultyService {
  /**
   * Create a new instance.
   *
   * @param {PrismaService} prisma - prisma value.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle create.
   *
   * @param {CreateDifficultyDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async create(dto: CreateDifficultyDto): Promise<void> {
    const duplicate = await this.prisma.difficulty.findFirst({
      where: {
        name: { equals: dto.name, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException("DIFFICULTY_NAME_TAKEN");
    }

    await this.prisma.difficulty.create({
      data: { name: dto.name, difficultyScore: dto.difficultyScore },
    });
  }

  /**
   * Handle update.
   *
   * @param {UpdateDifficultyDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async update(dto: UpdateDifficultyDto): Promise<void> {
    const difficulty = await this.prisma.difficulty.findFirst({
      where: { id: dto.difficultyId, deletedAt: null },
      select: { id: true },
    });
    if (!difficulty) {
      throw new NotFoundException("DIFFICULTY_NOT_FOUND");
    }

    const duplicate = await this.prisma.difficulty.findFirst({
      where: {
        id: { not: dto.difficultyId },
        name: { equals: dto.name, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException("DIFFICULTY_NAME_TAKEN");
    }

    await this.prisma.difficulty.update({
      where: { id: dto.difficultyId },
      data: { name: dto.name, difficultyScore: dto.difficultyScore },
    });
  }

  /**
   * Handle remove.
   *
   * @param {DeleteDifficultiesDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async remove(dto: DeleteDifficultiesDto): Promise<void> {
    const found = await this.prisma.difficulty.findMany({
      where: { id: { in: dto.difficultyIds }, deletedAt: null },
      select: { id: true },
    });

    if (found.length !== dto.difficultyIds.length) {
      const foundIds = new Set(found.map((difficulty) => difficulty.id));
      const missingIds = dto.difficultyIds.filter((id) => !foundIds.has(id));

      if (dto.difficultyIds.length === 1) {
        throw new NotFoundException("DIFFICULTY_NOT_FOUND");
      }

      throw new NotFoundException({
        message: "SOME_DIFFICULTIES_NOT_FOUND",
        data: { missingIds },
      });
    }

    const [stageUsage, levelUsage] = await Promise.all([
      this.prisma.stageConfigLevel.findFirst({
        where: {
          difficultyId: { in: dto.difficultyIds },
          deletedAt: null,
          stageConfig: { deletedAt: null },
        },
        select: { difficultyId: true },
      }),
      this.prisma.level.findFirst({
        where: {
          difficultyId: { in: dto.difficultyIds },
          deletedAt: null,
        },
        select: { difficultyId: true },
      }),
    ]);

    if (stageUsage) {
      throw new ConflictException("DIFFICULTY_IN_USE_BY_STAGE_CONFIG");
    }

    if (levelUsage) {
      throw new ConflictException("DIFFICULTY_IN_USE_BY_LEVELS");
    }

    await this.prisma.difficulty.updateMany({
      where: { id: { in: dto.difficultyIds } },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Handle list.
   *
   * @param {ListDifficultiesDto} dto - dto value.
   *
   * @returns {Promise<{ data: { id: string; name: string; createdAt: Date; }[]; totalCount: number; }>} The asynchronous result.
   */
  async list(dto: ListDifficultiesDto) {
    const where = {
      deletedAt: null,
      ...(dto.search
        ? { name: { contains: dto.search, mode: "insensitive" as const } }
        : {}),
    };

    const [data, totalCount] = await Promise.all([
      this.prisma.difficulty.findMany({
        where,
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          difficultyScore: true,
          createdAt: true,
        },
      }),
      this.prisma.difficulty.count({ where }),
    ]);

    return { data, totalCount };
  }
}
