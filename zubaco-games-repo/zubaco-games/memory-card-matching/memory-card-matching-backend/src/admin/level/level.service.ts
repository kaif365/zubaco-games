import { PrismaService } from "@common/prisma/prisma.service";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";

import type { CreateLevelDto } from "./dto/create-level.dto";
import type { DeleteLevelsDto } from "./dto/delete-levels.dto";
import type { ListLevelsDto } from "./dto/list-levels.dto";
import type { UpdateLevelDto } from "./dto/update-level.dto";

type LevelContentConfig =
  | { type: "symbol"; items: string[] }
  | { type: "image"; assetKeys: string[] }
  | { type: "color"; items: string[] }
  | { type: "wordImage"; items: Array<{ word: string; imageKey: string }> };

/**
 * Manages admin CRUD operations for playable memory-card levels.
 */
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
  async create(dto: CreateLevelDto): Promise<void> {
    await this.validateDifficulty(dto.difficultyId, "DIFFICULTY_NOT_FOUND");
    await this.validateLevelPayload(dto);

    const duplicate = await this.prisma.level.findFirst({
      where: {
        difficultyId: dto.difficultyId,
        name: { equals: dto.name, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException("LEVEL_NAME_TAKEN");
    }

    await this.prisma.level.create({
      data: this.mapLevelData(dto),
    });
  }

  /**
   * Handle update.
   *
   * @param {UpdateLevelDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async update(dto: UpdateLevelDto): Promise<void> {
    await this.validateDifficulty(dto.difficultyId, "DIFFICULTY_NOT_FOUND");
    await this.validateLevelPayload(dto);

    const existingLevel = await this.prisma.level.findFirst({
      where: { id: dto.levelId, deletedAt: null },
      select: { id: true },
    });

    if (!existingLevel) {
      throw new NotFoundException("LEVEL_NOT_FOUND");
    }

    const duplicate = await this.prisma.level.findFirst({
      where: {
        id: { not: dto.levelId },
        difficultyId: dto.difficultyId,
        name: { equals: dto.name, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException("LEVEL_NAME_TAKEN");
    }

    await this.prisma.level.update({
      where: { id: dto.levelId },
      data: this.mapLevelData(dto),
    });
  }

  /**
   * Handle remove.
   *
   * @param {DeleteLevelsDto} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async remove(dto: DeleteLevelsDto): Promise<void> {
    const found = await this.prisma.level.findMany({
      where: { id: { in: dto.levelIds }, deletedAt: null },
      select: { id: true, difficultyId: true },
    });

    if (found.length !== dto.levelIds.length) {
      if (dto.levelIds.length === 1) {
        throw new NotFoundException("LEVEL_NOT_FOUND");
      }

      const foundIds = new Set(found.map((level) => level.id));
      const missingIds = dto.levelIds.filter(
        (levelId) => !foundIds.has(levelId),
      );

      throw new NotFoundException({
        message: "SOME_LEVELS_NOT_FOUND",
        data: { missingIds },
      });
    }

    const affectedDifficultyIds = [
      ...new Set(found.map((level) => level.difficultyId)),
    ];
    const stageRequirements = await this.prisma.stageConfigLevel.groupBy({
      by: ["difficultyId"],
      where: {
        difficultyId: { in: affectedDifficultyIds },
        deletedAt: null,
        stageConfig: { deletedAt: null },
      },
      _sum: { boardCount: true },
    });

    if (stageRequirements.length > 0) {
      const remainingCounts = await this.prisma.level.groupBy({
        by: ["difficultyId"],
        where: {
          difficultyId: { in: affectedDifficultyIds },
          deletedAt: null,
          id: { notIn: dto.levelIds },
        },
        _count: { id: true },
      });

      const remainingByDifficulty = new Map(
        remainingCounts.map((count) => [count.difficultyId, count._count.id]),
      );

      const violatingDifficultyIds = stageRequirements
        .filter(
          (requirement) =>
            (remainingByDifficulty.get(requirement.difficultyId) ?? 0) <
            (requirement._sum.boardCount ?? 0),
        )
        .map((requirement) => requirement.difficultyId);

      if (violatingDifficultyIds.length > 0) {
        throw new ConflictException({
          message: "LEVEL_DELETE_VIOLATES_STAGE_CONFIG",
          data: { difficultyIds: violatingDifficultyIds },
        });
      }
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
   * @returns {Promise<{ data: Awaited<ReturnType<PrismaService["level"]["findMany"]>>; totalCount: number }>} The asynchronous result.
   */
  async list(dto: ListLevelsDto) {
    const where: Prisma.LevelWhereInput = {
      deletedAt: null,
      ...(dto.search
        ? { name: { contains: dto.search, mode: "insensitive" } }
        : {}),
      ...(dto.difficultyId ? { difficultyId: dto.difficultyId } : {}),
      ...(dto.cardContentType ? { cardContentType: dto.cardContentType } : {}),
      ...(dto.gridRows ? { gridRows: dto.gridRows } : {}),
      ...(dto.gridColumns ? { gridColumns: dto.gridColumns } : {}),
    };

    const [levels, totalCount] = await Promise.all([
      this.prisma.level.findMany({
        where,
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: "desc" },
        include: {
          difficulty: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.level.count({ where }),
    ]);

    return { data: levels, totalCount };
  }

  /**
   * Handle get details.
   *
   * @param {string} levelId - level id value.
   *
   * @returns {Promise<Awaited<ReturnType<PrismaService["level"]["findFirst"]>>>} The asynchronous result.
   */
  async getDetails(levelId: string) {
    const level = await this.prisma.level.findFirst({
      where: { id: levelId, deletedAt: null },
      include: {
        difficulty: {
          select: { id: true, name: true },
        },
      },
    });

    if (!level) {
      throw new NotFoundException("LEVEL_NOT_FOUND");
    }

    return level;
  }

  /**
   * Handle list configured pool by difficulty.
   *
   * @param {string[]} difficultyIds - difficulty ids value.
   * @param {PrismaClient | Prisma.TransactionClient | undefined} client - client value.
   *
   * @returns {Promise<Map<string, Awaited<ReturnType<PrismaService["level"]["findMany"]>>>>} The asynchronous result.
   */
  async listConfiguredPoolByDifficulty(
    difficultyIds: string[],
    client?: PrismaClient | Prisma.TransactionClient,
  ): Promise<
    Map<string, Awaited<ReturnType<PrismaService["level"]["findMany"]>>>
  > {
    const prisma = client ?? this.prisma;
    const levels = await prisma.level.findMany({
      where: {
        difficultyId: { in: difficultyIds },
        deletedAt: null,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    return levels.reduce((map, level) => {
      const existing = map.get(level.difficultyId) ?? [];
      existing.push(level);
      map.set(level.difficultyId, existing);
      return map;
    }, new Map<string, typeof levels>());
  }

  /**
   * Handle validate difficulty.
   *
   * @param {string} difficultyId - difficulty id value.
   * @param {string} errorCode - error code value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  private async validateDifficulty(
    difficultyId: string,
    errorCode: string,
  ): Promise<void> {
    const difficulty = await this.prisma.difficulty.findFirst({
      where: { id: difficultyId, deletedAt: null },
      select: { id: true },
    });

    if (!difficulty) {
      throw new NotFoundException(errorCode);
    }
  }

  /**
   * Handle validate level payload.
   *
   * @param {Pick<CreateLevelDto | UpdateLevelDto, "gridRows" | "gridColumns" | "cardContentType" | "contentConfig" | "previewDurationSeconds" | "mismatchDisplayDurationSeconds">} dto - dto value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  private async validateLevelPayload(
    dto: Pick<
      CreateLevelDto | UpdateLevelDto,
      | "gridRows"
      | "gridColumns"
      | "cardContentType"
      | "contentConfig"
      | "previewDurationSeconds"
      | "mismatchDisplayDurationSeconds"
    >,
  ): Promise<void> {
    const totalCards = dto.gridRows * dto.gridColumns;

    if (totalCards % 2 !== 0) {
      throw new BadRequestException("LEVEL_CONTENT_INVALID");
    }

    if (dto.contentConfig.type !== dto.cardContentType) {
      throw new BadRequestException("LEVEL_CONTENT_INVALID");
    }

    const requiredPairs = totalCards / 2;
    const availablePairs = this.getAvailablePairCount(dto.contentConfig);

    if (availablePairs !== requiredPairs) {
      throw new BadRequestException("LEVEL_CONTENT_INVALID");
    }

    const referencedKeys = this.getReferencedKeys(dto.contentConfig);
    if (referencedKeys.length === 0) {
      return;
    }

    const found = await this.prisma.file.findMany({
      where: {
        key: { in: referencedKeys },
        deletedAt: null,
      },
      select: { key: true },
    });

    if (found.length !== referencedKeys.length) {
      const foundKeys = new Set(found.map((file) => file.key));
      const missingKeys = referencedKeys.filter((key) => !foundKeys.has(key));

      throw new BadRequestException({
        message: "REFERENCED_FILE_NOT_FOUND",
        data: { missingKeys },
      });
    }
  }

  /**
   * Handle map level data.
   *
   * @param {CreateLevelDto | UpdateLevelDto} dto - dto value.
   *
   * @returns {Prisma.LevelUncheckedCreateInput | Prisma.LevelUncheckedUpdateInput} The mapped payload.
   */
  private mapLevelData(dto: CreateLevelDto | UpdateLevelDto) {
    return {
      difficultyId: dto.difficultyId,
      name: dto.name,
      gridRows: dto.gridRows,
      gridColumns: dto.gridColumns,
      cardContentType: dto.cardContentType,
      previewDurationSeconds: dto.previewDurationSeconds,
      mismatchDisplayDurationSeconds: dto.mismatchDisplayDurationSeconds,
      contentConfig: dto.contentConfig,
    };
  }

  /**
   * Handle get available pair count.
   *
   * @param {LevelContentConfig} contentConfig - content config value.
   *
   * @returns {number} The available pair count.
   */
  private getAvailablePairCount(contentConfig: LevelContentConfig): number {
    switch (contentConfig.type) {
      case "symbol":
      case "color":
        return contentConfig.items.length;
      case "image":
        return contentConfig.assetKeys.length;
      case "wordImage":
        return contentConfig.items.length;
      default:
        return 0;
    }
  }

  /**
   * Handle get referenced keys.
   *
   * @param {LevelContentConfig} contentConfig - content config value.
   *
   * @returns {string[]} The referenced keys.
   */
  private getReferencedKeys(contentConfig: LevelContentConfig): string[] {
    switch (contentConfig.type) {
      case "image":
        return contentConfig.assetKeys;
      case "wordImage":
        return contentConfig.items.map((item) => item.imageKey);
      default:
        return [];
    }
  }
}
