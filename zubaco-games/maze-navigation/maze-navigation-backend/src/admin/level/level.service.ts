import { PrismaService } from "@common/prisma/prisma.service";
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";

import { CreateLevelDto, UpdateLevelDto } from "./dto/create-level.dto";

@Injectable()
export class LevelService {
  /**
   * Create a new instance.
   *
   * @param {PrismaService} prisma - prisma value.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a level.
   *
   * @param {CreateLevelDto} dto - dto value.
   *
   * @returns {Promise<object>} The created level.
   */
  async create(dto: CreateLevelDto) {
    const existing = await this.prisma.level.findFirst({
      where: { name: dto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException("LEVEL_NAME_TAKEN");
    }
    return this.prisma.level.create({ data: { name: dto.name } });
  }

  /**
   * Find all levels.
   *
   * @returns {Promise<object[]>} All levels.
   */
  async findAll() {
    return this.prisma.level.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { difficultyConfig: true },
    });
  }

  /**
   * Find one level.
   *
   * @param {string} id - id value.
   *
   * @returns {Promise<object>} The level.
   */
  async findOne(id: string) {
    const level = await this.prisma.level.findFirst({
      where: { id, deletedAt: null },
      include: { difficultyConfig: true },
    });
    if (!level) {
      throw new NotFoundException("LEVEL_NOT_FOUND");
    }
    return level;
  }

  /**
   * Update a level.
   *
   * @param {string} id - id value.
   * @param {UpdateLevelDto} dto - dto value.
   *
   * @returns {Promise<object>} The updated level.
   */
  async update(id: string, dto: UpdateLevelDto) {
    await this.findOne(id);
    if (dto.name) {
      const existing = await this.prisma.level.findFirst({
        where: { name: dto.name, deletedAt: null, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException("LEVEL_NAME_TAKEN");
      }
    }
    return this.prisma.level.update({ where: { id }, data: dto });
  }

  /**
   * Delete a level.
   *
   * @param {string} id - id value.
   *
   * @returns {Promise<object>} The deleted level.
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.level.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
