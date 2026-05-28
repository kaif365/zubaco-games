import { PrismaService } from "@common/prisma/prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";

import { BoardCellResponse, BoardResponse } from "../../game/game.service";

export interface DemoResult {
  stageId: string;
  enableDemo: boolean;
  totalRounds: number;
  boards: BoardResponse[];
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
   * Get demo boards — returns all demo boards at once with no session validation.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<DemoResult>} The asynchronous result.
   */
  async getDemo(userId: string, stageId: string): Promise<DemoResult> {
    const stageConfig = await this.prisma.stageConfig.findFirst({
      where: { stageId, deletedAt: null },
      select: {
        enableDemo: true,
        demoLevels: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          select: {
            levelId: true,
            boardCount: true,
          },
        },
      },
    });

    if (!stageConfig) {
      throw new NotFoundException("STAGE_CONFIG_NOT_FOUND");
    }

    if (!stageConfig.enableDemo || stageConfig.demoLevels.length === 0) {
      return {
        stageId,
        enableDemo: stageConfig.enableDemo,
        totalRounds: 0,
        boards: [],
      };
    }

    const boards: BoardResponse[] = [];
    let roundNumber = 1;

    for (const demoLevel of stageConfig.demoLevels) {
      const picked = await this.pickRandomBoardIds(
        demoLevel.levelId,
        demoLevel.boardCount,
      );

      if (picked.length === 0) continue;

      const levelBoards = await this.prisma.board.findMany({
        where: { id: { in: picked }, deletedAt: null },
        include: {
          cells: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
          blocks: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
        },
      });

      const boardMap = new Map(levelBoards.map((b) => [b.id, b]));
      for (const id of picked) {
        const board = boardMap.get(id);
        if (!board) continue;
        boards.push(this.formatDemoBoardResponse(board, roundNumber++));
      }
    }

    return { stageId, enableDemo: true, totalRounds: boards.length, boards };
  }

  /**
   * Format a DB board into the standard BoardResponse shape.
   *
   * @param board - full board row with cells and blocks.
   * @param roundNumber - 1-based position in the demo sequence.
   *
   * @returns {BoardResponse} The formatted board response.
   */
  private formatDemoBoardResponse(
    board: {
      id: string;
      gridX: number;
      gridY: number;
      cells: {
        row: number;
        col: number;
        cellType: number;
        orientation: number;
        direction: string | null;
        x: number;
        y: number;
      }[];
      blocks: {
        id: string;
        row: number;
        col: number;
        blockType: number;
        orientation: number;
        isFixed: boolean;
      }[];
    },
    roundNumber: number,
  ): BoardResponse {
    const CELL_TARGET = 2;

    return {
      sessionBoardId: board.id,
      id: board.id,
      roundNumber,
      gridSize: { x: board.gridX, y: board.gridY },
      cells: board.cells.map((c) => {
        const base: BoardCellResponse = {
          id: `${c.row}_${c.col}`,
          row: c.row,
          col: c.col,
          type: c.cellType,
          fixed: true,
          x: c.x,
          y: c.y,
        };
        if (c.direction) base.direction = c.direction;
        if (c.cellType === CELL_TARGET) base.radius = 0.15;
        return base;
      }),
      initialBlocks: board.blocks.map((b) => ({
        id: b.id,
        row: b.row,
        col: b.col,
        type: b.blockType,
        isFixed: b.isFixed,
      })),
    };
  }

  /**
   * Pick random board ids from a level.
   *
   * @param {string} levelId - level id value.
   * @param {number} count - count value.
   *
   * @returns {Promise<string[]>} The asynchronous result.
   */
  private async pickRandomBoardIds(
    levelId: string,
    count: number,
  ): Promise<string[]> {
    if (count <= 0) return [];

    const rows = await this.prisma.board.findMany({
      where: { levelId, deletedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
    });

    return rows
      .map((row) => row.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }
}
