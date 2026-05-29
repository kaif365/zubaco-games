import { DEFAULT_STAGE_CONFIG } from "@common/constants";
import { PrismaService } from "@common/prisma/prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";

import {
  generateMaze,
  generateServerSeed,
  computeFinalSeed,
  computeShortestPath,
} from "../../game/utils/maze-generator";

export interface DemoMaze {
  levelId: string;
  levelName: string;
  rows: number;
  cols: number;
  mazeGrid: number[][];
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  shortestPathLength: number;
}

export interface DemoResult {
  stageId: string;
  enableDemo: boolean;
  levels: DemoMaze[];
}

@Injectable()
export class DemoService {
  /**
   * Create a new instance.
   *
   * @param {PrismaService} prisma - prisma value.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return a preview maze per level for the given stage.
   *
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<DemoResult>} The demo result.
   */
  async getDemo(_userId: string, stageId: string): Promise<DemoResult> {
    const stageConfig = await this.prisma.stageConfig.findFirst({
      where: { stageId, deletedAt: null },
      select: {
        enableDemo: true,
        levels: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          select: {
            levelId: true,
            level: { select: { id: true, name: true } },
          },
        },
        demoLevels: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          select: {
            levelId: true,
            level: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!stageConfig) {
      throw new NotFoundException("STAGE_CONFIG_NOT_FOUND");
    }

    if (!stageConfig.enableDemo) {
      return { stageId, enableDemo: false, levels: [] };
    }

    // Use demoLevels if defined, otherwise fall back to normal levels
    const demoLevelConfigs =
      stageConfig.demoLevels.length > 0
        ? stageConfig.demoLevels
        : stageConfig.levels;

    const levels: DemoMaze[] = [];

    for (const levelConfig of demoLevelConfigs) {
      const maze = await this.buildDemoMaze(
        levelConfig.levelId,
        levelConfig.level.name,
      );
      if (maze) {
        levels.push(maze);
      }
    }

    return { stageId, enableDemo: true, levels };
  }

  /**
   * Build a single demo maze for a level — uses a template if available,
   * otherwise falls back to procedural generation.
   *
   * @param {string} levelId - level id value.
   * @param {string} levelName - level name value.
   *
   * @returns {Promise<DemoMaze | null>} The demo maze or null when no config exists.
   */
  private async buildDemoMaze(
    levelId: string,
    levelName: string,
  ): Promise<DemoMaze | null> {
    const template = await this.prisma.mazeTemplate.findFirst({
      where: { levelId, deletedAt: null },
    });

    if (template) {
      const grid = template.grid as number[][];
      const path: number = computeShortestPath(
        grid,
        template.startRow,
        template.startCol,
        template.endRow,
        template.endCol,
      );
      return {
        levelId,
        levelName,
        rows: template.rows,
        cols: template.cols,
        mazeGrid: grid,
        startRow: template.startRow,
        startCol: template.startCol,
        endRow: template.endRow,
        endCol: template.endCol,
        shortestPathLength: path ?? 0,
      };
    }

    const difficultyConfig = await this.prisma.mazeDifficultyConfig.findFirst({
      where: { levelId, deletedAt: null },
    });

    const rows = difficultyConfig?.rows ?? DEFAULT_STAGE_CONFIG.MAZE_ROWS;
    const cols = difficultyConfig?.cols ?? DEFAULT_STAGE_CONFIG.MAZE_COLS;

    const serverSeed = generateServerSeed();
    const demoClientSeed = "demo";
    const finalSeed = computeFinalSeed(serverSeed, demoClientSeed, 0);
    const grid = generateMaze(rows, cols, finalSeed);

    const startRow = 1;
    const startCol = 1;
    const endRow = rows - 2;
    const endCol = cols - 2;

    const path = computeShortestPath(grid, startRow, startCol, endRow, endCol);

    return {
      levelId,
      levelName,
      rows,
      cols,
      mazeGrid: grid,
      startRow,
      startCol,
      endRow,
      endCol,
      shortestPathLength: path ?? 0,
    };
  }
}
