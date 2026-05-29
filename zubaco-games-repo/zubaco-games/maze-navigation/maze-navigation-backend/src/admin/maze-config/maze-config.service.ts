import { PrismaService } from "@common/prisma/prisma.service";
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";

import {
  CreateMazeConfigDto,
  UpdateMazeConfigDto,
} from "./dto/create-maze-config.dto";

@Injectable()
export class MazeConfigService {
  /**
   * Create a new instance.
   *
   * @param {PrismaService} prisma - prisma value.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a maze difficulty config.
   *
   * @param {CreateMazeConfigDto} dto - dto value.
   *
   * @returns {Promise<object>} The created config.
   */
  async create(dto: CreateMazeConfigDto) {
    // Check level exists
    const level = await this.prisma.level.findFirst({
      where: { id: dto.levelId, deletedAt: null },
    });
    if (!level) {
      throw new NotFoundException("LEVEL_NOT_FOUND");
    }

    const existing = await this.prisma.mazeDifficultyConfig.findUnique({
      where: { levelId: dto.levelId },
    });
    if (existing) {
      throw new ConflictException("MAZE_CONFIG_ALREADY_EXISTS");
    }

    return this.prisma.mazeDifficultyConfig.create({
      data: { levelId: dto.levelId, rows: dto.rows, cols: dto.cols },
    });
  }

  /**
   * Find all maze configs.
   *
   * @returns {Promise<object[]>} All maze difficulty configs.
   */
  async findAll() {
    return this.prisma.mazeDifficultyConfig.findMany({
      where: { deletedAt: null },
      include: { level: true },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Find one maze config.
   *
   * @param {string} id - id value.
   *
   * @returns {Promise<object>} The maze config.
   */
  async findOne(id: string) {
    const config = await this.prisma.mazeDifficultyConfig.findFirst({
      where: { id, deletedAt: null },
      include: { level: true },
    });
    if (!config) {
      throw new NotFoundException("MAZE_CONFIG_NOT_FOUND");
    }
    return config;
  }

  /**
   * Find config by level id.
   *
   * @param {string} levelId - level id value.
   *
   * @returns {Promise<object>} The maze config.
   */
  async findByLevel(levelId: string) {
    const config = await this.prisma.mazeDifficultyConfig.findFirst({
      where: { levelId, deletedAt: null },
    });
    if (!config) {
      throw new NotFoundException("MAZE_CONFIG_NOT_FOUND");
    }
    return config;
  }

  /**
   * Update a maze config.
   *
   * @param {string} id - id value.
   * @param {UpdateMazeConfigDto} dto - dto value.
   *
   * @returns {Promise<object>} The updated config.
   */
  async update(id: string, dto: UpdateMazeConfigDto) {
    await this.findOne(id);
    return this.prisma.mazeDifficultyConfig.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete a maze config.
   *
   * @param {string} id - id value.
   *
   * @returns {Promise<object>} The deleted config.
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.mazeDifficultyConfig.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
