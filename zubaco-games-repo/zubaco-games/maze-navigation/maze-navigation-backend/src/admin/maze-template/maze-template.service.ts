import { PrismaService } from "@common/prisma/prisma.service";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  generateMaze,
  generateServerSeed,
  computeShortestPath,
} from "src/game/utils/maze-generator";

import {
  CreateMazeTemplateDto,
  GenerateMazeTemplateDto,
  QueryMazeTemplateDto,
  UpdateMazeTemplateDto,
} from "./dto/maze-template.dto";

@Injectable()
export class MazeTemplateService {
  private readonly logger = new Logger(MazeTemplateService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMazeTemplateDto) {
    return this.prisma.mazeTemplate.create({
      data: dto,
    });
  }

  async generate(dto: GenerateMazeTemplateDto) {
    this.logger.log(
      `Generating new board for Level: ${dto.levelId || "Manual"}`,
    );
    const {
      levelId,
      seed,
      startRow,
      startCol,
      endRow,
      endCol,
      rows: customRows,
      cols: customCols,
    } = dto;

    let finalRows = customRows;
    let finalCols = customCols;

    // 1. Get difficulty config if levelId provided and rows/cols missing
    if (levelId && (!finalRows || !finalCols)) {
      const cfg = await this.prisma.mazeDifficultyConfig.findFirst({
        where: { levelId, deletedAt: null },
      });
      if (cfg) {
        finalRows = finalRows ?? cfg.rows;
        finalCols = finalCols ?? cfg.cols;
      }
    }

    if (!finalRows || !finalCols) {
      throw new BadRequestException(
        "Rows and columns must be provided or derived from level difficulty",
      );
    }

    // 2. Generate maze
    const finalSeed = seed ?? generateServerSeed();
    const grid = generateMaze(finalRows, finalCols, finalSeed);
    const rows = grid.length;
    const cols = grid[0].length;

    // 3. Set custom start/end points and ensure they are carved
    const actualStartRow = startRow ?? 1;
    const actualStartCol = startCol ?? 1;
    const actualEndRow = endRow ?? rows - 2;
    const actualEndCol = endCol ?? cols - 2;

    if (
      actualStartRow >= rows ||
      actualStartCol >= cols ||
      actualEndRow >= rows ||
      actualEndCol >= cols
    ) {
      throw new BadRequestException(
        "Custom start or end coordinates are out of bounds",
      );
    }

    grid[actualStartRow][actualStartCol] = 0;
    grid[actualEndRow][actualEndCol] = 0;

    // Verify solvability
    const pathLength = computeShortestPath(
      grid,
      actualStartRow,
      actualStartCol,
      actualEndRow,
      actualEndCol,
    );

    if (pathLength === -1) {
      throw new BadRequestException(
        "The generated maze is not solvable with the provided start/end points.",
      );
    }

    // 4. Return result without saving
    return {
      levelId: levelId ?? null,
      grid,
      rows,
      cols,
      startRow: actualStartRow,
      startCol: actualStartCol,
      endRow: actualEndRow,
      endCol: actualEndCol,
      seed: finalSeed,
      solvable: true,
      pathLength,
    };
  }

  async findAll(query: QueryMazeTemplateDto) {
    const { id, levelId, limit, offset } = query;
    return this.prisma.mazeTemplate.findMany({
      where: {
        id,
        levelId,
        deletedAt: null,
      },
      include: {
        level: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.mazeTemplate.findFirst({
      where: { id, deletedAt: null },
    });
    if (!template) {
      throw new NotFoundException(`MazeTemplate with ID ${id} not found`);
    }
    return template;
  }

  async update(id: string, dto: UpdateMazeTemplateDto) {
    const template = await this.findOne(id);

    // If coordinates or grid are changing, verify solvability
    const newStartRow = dto.startRow ?? template.startRow;
    const newStartCol = dto.startCol ?? template.startCol;
    const newEndRow = dto.endRow ?? template.endRow;
    const newEndCol = dto.endCol ?? template.endCol;
    const newGrid = (dto.grid as number[][]) ?? (template.grid as number[][]);

    // Carve new points if they are walls
    newGrid[newStartRow][newStartCol] = 0;
    newGrid[newEndRow][newEndCol] = 0;

    const pathLength = computeShortestPath(
      newGrid,
      newStartRow,
      newStartCol,
      newEndRow,
      newEndCol,
    );

    if (pathLength === -1) {
      throw new BadRequestException(
        "The update would make the maze unsolvable. Please check your coordinates.",
      );
    }

    return this.prisma.mazeTemplate.update({
      where: { id },
      data: {
        ...dto,
        grid: newGrid as any, // Ensure points are carved in the DB too
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.mazeTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
