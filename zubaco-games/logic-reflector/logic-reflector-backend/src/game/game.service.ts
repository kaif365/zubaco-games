import {
  GAME_SESSION_STATUS,
  ANTI_CHEAT_CONFIGS,
  CHEAT_FLAG_TYPE,
} from "@common/constants";
import { PrismaService } from "@common/prisma/prisma.service";
import { config } from "@config";
import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma";
import { TerminalError } from "@restatedev/restate-sdk";

import { SnsService } from "../aws/sns.service";

import { GameExpiryService } from "./game-expiry.service";
import {
  InFlightBoard,
  InFlightBlock,
  InFlightSession,
  InFlightMove,
  InitialBlock,
} from "./game-restate-state.types";
import { replayMoves, MoveInput } from "./utils/move-validator";
import { calculateRoundScore, calculateTimeBonus } from "./utils/score.util";
import { isSolved, SimCell, SimBlock } from "./utils/laser-simulator";
import { formatLevel, FormattedLevel } from "./utils/board-formatter";

// ── Response shapes ───────────────────────────────────────────────────────────

export interface BoardCellResponse {
  id: string;
  row: number;
  col: number;
  type: number; // CELL_TYPE enum: 1=emitter 2=target 3=blocker 4=reflect-block 5=mirror-fwd 6=mirror-bwd 7=splitter
  fixed: boolean;
  x: number;
  y: number;
  direction?: string; // emitter firing direction (NE, N, E, W …)
  radius?: number; // target hit-radius (always 0.15)
}

export interface BoardBlockResponse {
  id: string;
  row: number;
  col: number;
  type: number; // BLOCK_TYPE enum: 1=reflect-block 2=mirror-fwd 3=mirror-bwd 4=splitter 5=blocker
  isFixed: boolean;
}

export interface BoardResponse {
  sessionBoardId: string;
  id: string;
  roundNumber: number;
  gridSize: { x: number; y: number };
  cells: BoardCellResponse[];
  initialBlocks: BoardBlockResponse[];
}

export interface ScoreboardRound {
  roundNumber: number;
  score: number | null;
  startedAt: string;
  endedAt: string | null;
}

export interface Scoreboard {
  totalScore: number;
  timeBonus: number;
  rounds: ScoreboardRound[];
}

export interface GameResponse {
  status: number;
  sessionId: string | null;
  startedAt: string | null;
  expiryAt: string | null;
  totalRounds: number;
  board: BoardResponse | null;
  scoreboard: Scoreboard;
}

export type StartGameResponse = GameResponse;

export interface EndBoardResponse {
  gameOver: boolean;
  roundScore: number;
}

const TERMINAL_GAME_SESSION_STATUSES = [
  GAME_SESSION_STATUS.ENDED,
  GAME_SESSION_STATUS.EXPIRED,
  GAME_SESSION_STATUS.MANUALLY_ENDED,
] as const;
const INT32_MIN = -2_147_483_648;
const INT32_MAX = 2_147_483_647;

// ── Raw DB types for pickBoardWithData ────────────────────────────────────────

interface RawCell {
  row: number;
  col: number;
  cell_type: number;
  orientation: number;
  direction: string | null;
  x: number;
  y: number;
  sort_order: number;
}

interface RawBlock {
  id: string;
  row: number;
  col: number;
  block_type: number;
  orientation: number;
  is_fixed: boolean;
  sort_order: number;
}

interface RawAvailableBlock {
  block_type: number;
  count: number;
}

export interface PickedBoard {
  boardId: string;
  levelId: string;
  gridX: number;
  gridY: number;
  cells: RawCell[];
  blocks: RawBlock[];
  availableBlocks: RawAvailableBlock[];
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  /**
   * Create a new instance.
   *
   * @param {PrismaService} prisma - prisma service value.
   * @param {GameExpiryService} expiry - game expiry service value.
   * @param {SnsService} sns - sns service value.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly expiry: GameExpiryService,
    private readonly sns: SnsService,
  ) {}

  // ── DB read helpers ───────────────────────────────────────────────────────

  /**
   * Fetch the active stage configuration for a stage.
   *
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<object>} The asynchronous result.
   */
  async fetchStageConfig(stageId: string) {
    const stageConfig = await this.prisma.stageConfig.findFirst({
      where: { stageId, deletedAt: null },
      include: {
        levels: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          include: { level: { select: { id: true, name: true } } },
        },
      },
    });
    if (!stageConfig || !stageConfig.isEnabled) {
      throw new TerminalError("STAGE_CONFIG_NOT_FOUND", { errorCode: 404 });
    }
    if (stageConfig.levels.length === 0) {
      throw new TerminalError("STAGE_CONFIG_HAS_NO_LEVELS", { errorCode: 422 });
    }
    return stageConfig;
  }

  /**
   * Fetch a finalized session for a user and stage.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<object | null>} The asynchronous result.
   */
  async fetchFinalizedSession(userId: string, stageId: string) {
    return this.prisma.gameSession.findFirst({
      where: {
        userId,
        stageId,
        status: { in: [...TERMINAL_GAME_SESSION_STATUSES] },
      },
      include: {
        sessionBoards: {
          where: { deletedAt: null },
          orderBy: { roundNumber: "asc" },
        },
        stageConfigSnapshot: { include: { levelConfigs: true } },
      },
    });
  }

  /**
   * Fetch an open DB session when Restate state is unavailable.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<{ id: string; status: number } | null>} The asynchronous result.
   */
  async fetchOpenSession(userId: string, stageId: string) {
    return this.prisma.gameSession.findFirst({
      where: {
        userId,
        stageId,
        status: {
          in: [
            GAME_SESSION_STATUS.STARTED,
            GAME_SESSION_STATUS.RESULT_PROCESSING,
          ],
        },
      },
      select: { id: true, status: true },
    });
  }

  // ── DB write helpers ──────────────────────────────────────────────────────

  /**
   * Create the DB session shell and stage config snapshot for a game.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   * @param {Awaited<ReturnType<GameService['fetchStageConfig']>>} stageConfig - stage config value.
   *
   * @returns {Promise<{ sessionId: string; expiryAtMs: number; startedAtMs: number }>} The asynchronous result.
   */
  async createGameSession(
    userId: string,
    stageId: string,
    stageConfig: Awaited<ReturnType<typeof this.fetchStageConfig>>,
  ): Promise<{ sessionId: string; expiryAtMs: number; startedAtMs: number }> {
    const now = new Date();
    const expiryAt = new Date(now.getTime() + stageConfig.timeLimit * 1_000);

    const existing = await this.prisma.gameSession.findFirst({
      where: { userId, stageId, status: GAME_SESSION_STATUS.STARTED },
      select: { id: true, expiryAt: true, startedAt: true },
    });
    if (existing) {
      return {
        sessionId: existing.id,
        expiryAtMs: existing.expiryAt.getTime(),
        startedAtMs: existing.startedAt.getTime(),
      };
    }

    const session = await this.prisma.gameSession.create({
      data: {
        userId,
        stageId,
        expiryAt,
        startedAt: now,
        status: GAME_SESSION_STATUS.STARTED,
        stageConfigSnapshot: {
          create: {
            stageId,
            timeLimit: stageConfig.timeLimit,
            levelConfigs: {
              createMany: {
                data: stageConfig.levels.map((level) => ({
                  levelId: level.levelId,
                  levelName: level.level.name,
                  boardCount: level.boardCount,
                  order: level.order,
                })),
              },
            },
          },
        },
      },
      select: { id: true, expiryAt: true, startedAt: true },
    });

    return {
      sessionId: session.id,
      expiryAtMs: session.expiryAt.getTime(),
      startedAtMs: session.startedAt.getTime(),
    };
  }

  /**
   * Schedule durable Restate expiry handlers for a session.
   *
   * @param {string} sessionId - session id value.
   * @param {number} expiryAtMs - expiry at ms value.
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<void>} Resolves when handlers are scheduled.
   */
  async scheduleExpiry(
    sessionId: string,
    expiryAtMs: number,
    userId: string,
    stageId: string,
  ): Promise<void> {
    await this.expiry.schedule(sessionId, expiryAtMs, userId, stageId);
  }

  /**
   * Return demo board ids already snapshotted for the user and stage.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<string[]>} The asynchronous result.
   */
  async fetchDemoBoardIds(userId: string, stageId: string): Promise<string[]> {
    const rows = await this.prisma.userStageDemoBoard.findMany({
      where: { userId, stageId },
      select: { boardId: true },
    });
    return rows.map((r) => r.boardId);
  }

  /**
   * Pick a random board for the given level and return it with cells, blocks,
   * and availableBlocks in one raw SQL round trip.
   *
   * @param {string} levelId - level id value.
   * @param {string[]} excludeIds - board ids to exclude.
   *
   * @returns {Promise<PickedBoard>} The asynchronous result.
   */
  async pickBoardWithData(
    levelId: string,
    excludeIds: string[],
  ): Promise<PickedBoard> {
    type RawRow = {
      id: string;
      level_id: string;
      grid_x: number;
      grid_y: number;
      cells: RawCell[];
      blocks: RawBlock[];
      available_blocks: RawAvailableBlock[];
    };

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const excludeClause =
      excludeIds.length > 0
        ? (() => {
            if (excludeIds.some((id) => !UUID_RE.test(id))) {
              throw new TerminalError("INVALID_EXCLUDE_BOARD_IDS", {
                errorCode: 500,
              });
            }
            return Prisma.sql`AND b.id NOT IN (${Prisma.raw(excludeIds.map((id) => `'${id}'`).join(","))})`;
          })()
        : Prisma.empty;

    const total = await this.prisma.board.count({
      where: {
        levelId,
        deletedAt: null,
        ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
      },
    });
    if (total === 0) {
      throw new TerminalError("NO_BOARDS_AVAILABLE_FOR_LEVEL", {
        errorCode: 404,
      });
    }

    const offset = Math.floor(Math.random() * total);

    const query = Prisma.sql`
            SELECT
                b.id,
                b.level_id,
                b.grid_x,
                b.grid_y,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'row',        bc.row,
                            'col',        bc.col,
                            'cell_type',  bc.cell_type,
                            'orientation',bc.orientation,
                            'direction',  bc.direction,
                            'x',          bc.x,
                            'y',          bc.y,
                            'sort_order', bc.sort_order
                        )
                    ) FILTER (WHERE bc.id IS NOT NULL),
                    '[]'::json
                ) AS cells,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'id',          bb.id,
                            'row',         bb.row,
                            'col',         bb.col,
                            'block_type',  bb.block_type,
                            'orientation', bb.orientation,
                            'is_fixed',    bb.is_fixed,
                            'sort_order',  bb.sort_order
                        )
                    ) FILTER (WHERE bb.id IS NOT NULL),
                    '[]'::json
                ) AS blocks,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'block_type', bab.block_type,
                            'count',      bab.count
                        )
                    ) FILTER (WHERE bab.id IS NOT NULL),
                    '[]'::json
                ) AS available_blocks
            FROM boards b
            LEFT JOIN board_cells bc ON bc.board_id = b.id AND bc.deleted_at IS NULL
            LEFT JOIN board_blocks bb ON bb.board_id = b.id AND bb.deleted_at IS NULL
            LEFT JOIN board_available_blocks bab ON bab.board_id = b.id AND bab.deleted_at IS NULL
            WHERE b.level_id = ${levelId}
              AND b.deleted_at IS NULL
              ${excludeClause}
            GROUP BY b.id
            LIMIT 1
            OFFSET ${offset}
        `;

    const rows = await this.prisma.$queryRaw<RawRow[]>(query);

    const fallbackQuery = Prisma.sql`
            SELECT
                b.id,
                b.level_id,
                b.grid_x,
                b.grid_y,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'row',        bc.row,
                            'col',        bc.col,
                            'cell_type',  bc.cell_type,
                            'orientation',bc.orientation,
                            'direction',  bc.direction,
                            'x',          bc.x,
                            'y',          bc.y,
                            'sort_order', bc.sort_order
                        )
                    ) FILTER (WHERE bc.id IS NOT NULL),
                    '[]'::json
                ) AS cells,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'id',          bb.id,
                            'row',         bb.row,
                            'col',         bb.col,
                            'block_type',  bb.block_type,
                            'orientation', bb.orientation,
                            'is_fixed',    bb.is_fixed,
                            'sort_order',  bb.sort_order
                        )
                    ) FILTER (WHERE bb.id IS NOT NULL),
                    '[]'::json
                ) AS blocks,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'block_type', bab.block_type,
                            'count',      bab.count
                        )
                    ) FILTER (WHERE bab.id IS NOT NULL),
                    '[]'::json
                ) AS available_blocks
            FROM boards b
            LEFT JOIN board_cells bc ON bc.board_id = b.id AND bc.deleted_at IS NULL
            LEFT JOIN board_blocks bb ON bb.board_id = b.id AND bb.deleted_at IS NULL
            LEFT JOIN board_available_blocks bab ON bab.board_id = b.id AND bab.deleted_at IS NULL
            WHERE b.level_id = ${levelId}
              AND b.deleted_at IS NULL
              ${excludeClause}
            GROUP BY b.id
            LIMIT 1
        `;

    const row =
      rows[0] ?? (await this.prisma.$queryRaw<RawRow[]>(fallbackQuery))[0];

    if (!row) {
      throw new TerminalError("NO_BOARDS_AVAILABLE_FOR_LEVEL", {
        errorCode: 404,
      });
    }

    return {
      boardId: row.id,
      levelId: row.level_id,
      gridX: row.grid_x,
      gridY: row.grid_y,
      cells: row.cells ?? [],
      blocks: row.blocks ?? [],
      availableBlocks: row.available_blocks ?? [],
    };
  }

  /**
   * Build an InFlightBoard from a DB-picked board.
   *
   * @param {PickedBoard} picked - picked board value.
   * @param {number} roundNumber - round number value.
   * @param {boolean} isActive - is active value.
   *
   * @returns {InFlightBoard} The in-flight board state.
   */
  buildInFlightBoard(
    picked: PickedBoard,
    roundNumber: number,
    isActive: boolean,
  ): InFlightBoard {
    const now = new Date().toISOString();

    // Pre-placed blocks (from board_blocks) — all start on the board
    const preplacedBlocks: InFlightBlock[] = picked.blocks.map((b) => ({
      id: crypto.randomUUID(),
      blockId: b.id,
      row: b.row,
      col: b.col,
      blockType: b.block_type,
      orientation: b.orientation,
      isFixed: b.is_fixed,
      placedAt: now,
      removedAt: null,
    }));

    // Inventory blocks (from board_available_blocks) — not yet placed on the board
    const inventoryBlocks: InFlightBlock[] = picked.availableBlocks.flatMap(
      (ab) =>
        Array.from({ length: ab.count }, () => ({
          id: crypto.randomUUID(),
          blockId: null,
          row: -1,
          col: -1,
          blockType: ab.block_type,
          orientation: 0,
          isFixed: false,
          placedAt: null,
          removedAt: null,
        })),
    );

    return {
      id: crypto.randomUUID(),
      boardId: picked.boardId,
      levelId: picked.levelId,
      gridX: picked.gridX,
      gridY: picked.gridY,
      roundNumber,
      startedAt: isActive ? now : now,
      endedAt: null,
      score: null,
      cells: picked.cells.map((c) => ({
        row: c.row,
        col: c.col,
        cellType: c.cell_type,
        orientation: c.orientation,
        direction: c.direction ?? null,
        x: c.x,
        y: c.y,
      })),
      blocks: [...preplacedBlocks, ...inventoryBlocks],
      initialBlocks: preplacedBlocks.map((b) => ({
        id: b.id,
        row: b.row,
        col: b.col,
        blockType: b.blockType,
        orientation: b.orientation,
        isFixed: b.isFixed,
      })),
      availableBlocks: picked.availableBlocks.map((ab) => ({
        blockType: ab.block_type,
        totalCount: ab.count,
        usedCount: 0,
      })),
      moves: [],
    };
  }

  // ── Laser solve check ─────────────────────────────────────────────────────

  /**
   * Rebuild the final set of placed blocks by replaying all successful moves
   * against the initial board state — mirrors the frontend's buildPlacedBlocksFromMoves.
   *
   * @param {InitialBlock[]} initialBlocks - immutable snapshot from board creation.
   * @param {InFlightMove[]} successfulMoves - moves with success === true, in order.
   *
   * @returns {InitialBlock[]} Final placed blocks after all moves.
   */
  buildFinalPlacedBlocksFromMoves(
    initialBlocks: InitialBlock[],
    successfulMoves: InFlightMove[],
  ): InitialBlock[] {
    const blockMap = new Map(initialBlocks.map((b) => [b.id, { ...b }]));

    for (const move of successfulMoves) {
      if (move.action === "remove") {
        if (move.sessionBlockId) {
          blockMap.delete(move.sessionBlockId);
        }
      } else {
        // place — update existing block position or insert inventory block
        if (move.sessionBlockId) {
          const existing = blockMap.get(move.sessionBlockId);
          if (existing) {
            existing.row = move.row;
            existing.col = move.col;
          } else {
            blockMap.set(move.sessionBlockId, {
              id: move.sessionBlockId,
              row: move.row,
              col: move.col,
              blockType: move.blockType!,
              orientation: 0,
              isFixed: false,
            });
          }
        }
      }
    }

    return [...blockMap.values()];
  }

  /**
   * Check if the current board state constitutes a solved laser puzzle.
   * Final block positions are derived by replaying all successful moves
   * against the initial board snapshot (same algorithm as the frontend).
   *
   * @param {InFlightBoard} board - board state value.
   *
   * @returns {boolean} Whether the board is solved.
   */
  isBoardSolved(board: InFlightBoard): boolean {
    const simCells: SimCell[] = board.cells.map((c) => ({
      row: c.row,
      col: c.col,
      cellType: c.cellType,
      orientation: c.orientation,
    }));

    const successfulMoves = board.moves.filter((m) => m.success);
    const finalBlocks = this.buildFinalPlacedBlocksFromMoves(
      board.initialBlocks ?? [],
      successfulMoves,
    );

    const simBlocks: SimBlock[] = finalBlocks.map((b) => ({
      row: b.row,
      col: b.col,
      blockType: b.blockType,
      orientation: b.orientation,
    }));

    return isSolved(board.gridY, board.gridX, simCells, simBlocks);
  }

  // ── Finalization ──────────────────────────────────────────────────────────

  /**
   * Commit the full in-flight game to the DB in a single transaction.
   *
   * @param {InFlightSession} session - session state value.
   * @param {InFlightBoard[]} boards - board state values.
   * @param {Date} now - current date value.
   * @param {number} hintStatus - fallback final status value.
   *
   * @returns {Promise<{ status: number; totalScore: number; timeBonus: number }>} The asynchronous result.
   */
  async finalizeAndCommit(
    session: InFlightSession,
    boards: InFlightBoard[],
    now: Date,
    hintStatus: number,
  ): Promise<{ status: number; totalScore: number; timeBonus: number }> {
    // Score any board that wasn't explicitly closed by endBoard
    const scoredBoards: InFlightBoard[] = boards.map((board) => {
      if (board.score !== null) {
        return board;
      }
      const solved = this.isBoardSolved(board);
      return {
        ...board,
        score: calculateRoundScore(solved),
        endedAt: board.endedAt ?? now.toISOString(),
      };
    });

    const allRoundsDone =
      scoredBoards.filter((board) => board.endedAt !== null).length >=
      session.totalRounds;
    const allSolved =
      allRoundsDone && scoredBoards.every((board) => board.score === 1000);

    const finalStatus =
      hintStatus === GAME_SESSION_STATUS.EXPIRED
        ? GAME_SESSION_STATUS.EXPIRED
        : allSolved
          ? GAME_SESSION_STATUS.ENDED
          : GAME_SESSION_STATUS.MANUALLY_ENDED;

    const bonusReferenceMs = session.lastMoveAt
      ? new Date(session.lastMoveAt).getTime()
      : now.getTime();
    const timeBonus =
      finalStatus === GAME_SESSION_STATUS.ENDED
        ? calculateTimeBonus(
            session.expiryAtMs - bonusReferenceMs,
            session.timeLimitSeconds,
          )
        : 0;

    const roundsScore = scoredBoards.reduce(
      (sum, board) => sum + (board.score ?? 0),
      0,
    );
    const totalScore = roundsScore + timeBonus;
    this.assertPersistableInt("gameSession.status", finalStatus);
    this.assertPersistableInt("gameSession.score", totalScore);
    this.assertPersistableInt("gameSession.timeBonus", timeBonus);
    this.assertPersistableSnapshotInts(scoredBoards);

    let existingFinalizeResult: {
      status: number;
      totalScore: number;
      timeBonus: number;
    } | null = null;

    await this.prisma.$transaction(async (tx) => {
      const existingSession = await tx.gameSession.findUnique({
        where: { id: session.sessionId },
        select: { status: true, score: true, timeBonus: true },
      });

      // Session was deleted (e.g. dev DB truncate) — nothing to finalize
      if (!existingSession) {
        this.logger.warn(
          `finalizeAndCommit: session ${session.sessionId} not found in DB — skipping`,
        );
        existingFinalizeResult = {
          status: finalStatus,
          totalScore: 0,
          timeBonus: 0,
        };
        return;
      }

      if (
        TERMINAL_GAME_SESSION_STATUSES.includes(
          existingSession.status as (typeof TERMINAL_GAME_SESSION_STATUSES)[number],
        )
      ) {
        existingFinalizeResult = {
          status: existingSession.status,
          totalScore: existingSession.score ?? 0,
          timeBonus: existingSession.timeBonus ?? 0,
        };
        return;
      }

      // Persist session boards
      await tx.gameSessionBoard.createMany({
        data: scoredBoards.map((board) => ({
          id: board.id,
          sessionId: session.sessionId,
          roundNumber: board.roundNumber,
          boardId: board.boardId,
          levelId: board.levelId,
          gridX: board.gridX,
          gridY: board.gridY,
          isActive: false,
          score: board.score,
          startedAt: new Date(board.startedAt),
          endedAt: board.endedAt ? new Date(board.endedAt) : now,
        })),
        skipDuplicates: true,
      });

      // Persist session blocks (fixed + player-placed)
      const allSessionBlocks = scoredBoards.flatMap((board) =>
        board.blocks
          .filter((b) => b.removedAt === null)
          .map((b) => ({
            id: b.id,
            sessionId: session.sessionId,
            sessionBoardId: board.id,
            blockId: b.blockId || null,
            row: b.row,
            col: b.col,
            blockType: b.blockType,
            isFixed: b.isFixed,
            placedAt: new Date(b.placedAt!),
            removedAt: b.removedAt ? new Date(b.removedAt) : null,
          })),
      );

      if (allSessionBlocks.length > 0) {
        await tx.gameSessionBlock.createMany({
          data: allSessionBlocks,
          skipDuplicates: true,
        });
      }

      // Persist moves
      if (scoredBoards.some((board) => board.moves.length > 0)) {
        await tx.gameMove.createMany({
          data: scoredBoards.flatMap((board) =>
            board.moves.map((move) => ({
              id: move.id,
              sessionId: session.sessionId,
              sessionBlockId: move.sessionBlockId ?? null,
              clientMoveId: move.clientMoveId,
              row: move.row,
              col: move.col,
              blockType: move.blockType,
              action: move.action,
              success: move.success,
              placedAt: new Date(move.placedAt),
            })),
          ),
          skipDuplicates: true,
        });
      }

      await tx.gameSession.update({
        where: { id: session.sessionId },
        data: {
          status: finalStatus,
          endedAt: now,
          score: totalScore,
          timeBonus,
        },
      });
    });

    if (existingFinalizeResult) {
      return existingFinalizeResult;
    }

    await this.verifyFinalizedSnapshotCounts(
      session.sessionId,
      scoredBoards.length,
      scoredBoards.reduce((sum, board) => sum + board.moves.length, 0),
    );

    // Anti-cheat — fire-and-forget after the main transaction commits
    this.runAntiCheatOnFinalize(session, scoredBoards);

    this.logger.log(
      `Session ${session.sessionId} finalized: status=${finalStatus} score=${totalScore} timeBonus=${timeBonus}`,
    );

    return { status: finalStatus, totalScore, timeBonus };
  }

  /**
   * Assert that a numeric value fits Prisma integer storage.
   *
   * @param {string} field - field name value.
   * @param {number | null | undefined} value - numeric value.
   *
   * @returns {void} Resolves when the value is valid.
   */
  private assertPersistableInt(
    field: string,
    value: number | null | undefined,
  ): void {
    if (value === null || value === undefined) {
      return;
    }

    if (!Number.isInteger(value) || value < INT32_MIN || value > INT32_MAX) {
      this.logger.warn(
        `Rejected out-of-range integer for ${field}: ${String(value)}`,
      );
      throw new TerminalError("INVALID_INTEGER_RANGE", { errorCode: 400 });
    }
  }

  /**
   * Assert that board and move snapshot integers fit Prisma integer storage.
   *
   * @param {InFlightBoard[]} boards - board values.
   *
   * @returns {void} Resolves when all integers are valid.
   */
  private assertPersistableSnapshotInts(boards: InFlightBoard[]): void {
    for (const board of boards) {
      this.assertPersistableInt(
        "gameSessionBoard.roundNumber",
        board.roundNumber,
      );
      this.assertPersistableInt("gameSessionBoard.gridX", board.gridX);
      this.assertPersistableInt("gameSessionBoard.gridY", board.gridY);
      this.assertPersistableInt("gameSessionBoard.score", board.score);

      for (const move of board.moves) {
        this.assertPersistableInt("gameMove.row", move.row);
        this.assertPersistableInt("gameMove.col", move.col);
        this.assertPersistableInt("gameMove.blockType", move.blockType);
      }
    }
  }

  /**
   * Verify finalized snapshot row counts after an idempotent commit.
   *
   * @param {string} sessionId - session id value.
   * @param {number} expectedBoards - expected board count value.
   * @param {number} expectedMoves - expected move count value.
   *
   * @returns {Promise<void>} Resolves when verification completes.
   */
  private async verifyFinalizedSnapshotCounts(
    sessionId: string,
    expectedBoards: number,
    expectedMoves: number,
  ): Promise<void> {
    const [actualBoards, actualMoves] = await Promise.all([
      this.prisma.gameSessionBoard.count({
        where: { sessionId, deletedAt: null },
      }),
      this.prisma.gameMove.count({
        where: { sessionId },
      }),
    ]);

    const countsMatch =
      actualBoards === expectedBoards && actualMoves === expectedMoves;

    if (!countsMatch) {
      this.logger.error(
        `Session ${sessionId} finalized snapshot count mismatch`,
        {
          expected: { boards: expectedBoards, moves: expectedMoves },
          actual: { boards: actualBoards, moves: actualMoves },
        },
      );
      return;
    }

    this.logger.debug(
      `Session ${sessionId} finalized snapshot counts verified: boards=${actualBoards} moves=${actualMoves}`,
    );
  }

  /**
   * Expire an open DB session when its Restate state is unavailable.
   *
   * @param {string} sessionId - session id value.
   *
   * @returns {Promise<boolean>} Whether an open session was expired.
   */
  async expireOpenSessionWithoutRestateState(
    sessionId: string,
  ): Promise<boolean> {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });
    if (!session) {
      return false;
    }
    if (
      session.status === GAME_SESSION_STATUS.ENDED ||
      session.status === GAME_SESSION_STATUS.EXPIRED ||
      session.status === GAME_SESSION_STATUS.MANUALLY_ENDED
    ) {
      return false;
    }

    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: GAME_SESSION_STATUS.EXPIRED,
        endedAt: new Date(),
        score: 0,
        timeBonus: 0,
      },
    });
    this.logger.warn(
      `Session ${sessionId} expired without Restate state; score defaulted to 0`,
    );
    return true;
  }

  /**
   * Build a finalize result without writing to the database.
   *
   * @param {InFlightSession} session - session state value.
   * @param {InFlightBoard[]} boards - board state values.
   * @param {Date} now - current date value.
   * @param {number} hintStatus - fallback final status value.
   *
   * @returns {{ status: number; totalScore: number; timeBonus: number }} The finalize result.
   */
  buildFinalizeResult(
    session: InFlightSession,
    boards: InFlightBoard[],
    now: Date,
    hintStatus: number,
  ): { status: number; totalScore: number; timeBonus: number } {
    const allRoundsDone =
      boards.filter((board) => board.endedAt !== null).length >=
      session.totalRounds;
    const allSolved =
      allRoundsDone && boards.every((board) => board.score === 1000);
    const finalStatus =
      hintStatus === GAME_SESSION_STATUS.EXPIRED
        ? GAME_SESSION_STATUS.EXPIRED
        : allSolved
          ? GAME_SESSION_STATUS.ENDED
          : GAME_SESSION_STATUS.MANUALLY_ENDED;
    const timeBonus =
      finalStatus === GAME_SESSION_STATUS.ENDED
        ? calculateTimeBonus(
            session.expiryAtMs - now.getTime(),
            session.timeLimitSeconds,
          )
        : 0;
    const totalScore =
      boards.reduce((sum, board) => sum + (board.score ?? 0), 0) + timeBonus;
    return { status: finalStatus, totalScore, timeBonus };
  }

  // ── Response builders ─────────────────────────────────────────────────────

  /**
   * Format an in-flight board as a client board response.
   *
   * @param {InFlightBoard} board - board state value.
   *
   * @returns {BoardResponse} The board response.
   */
  formatBoardResponseFromState(board: InFlightBoard): BoardResponse {
    const CELL_TARGET = 2;

    return {
      sessionBoardId: board.id,
      id: board.boardId,
      roundNumber: board.roundNumber,
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
        if (c.direction) {
          base.direction = c.direction;
        }
        if (c.cellType === CELL_TARGET) {
          base.radius = 0.15;
        }
        return base;
      }),
      initialBlocks: board.blocks
        .filter((b) => b.removedAt === null)
        .map((b: InFlightBlock) => ({
          id: b.id,
          row: b.row,
          col: b.col,
          type: b.blockType,
          isFixed: b.isFixed,
        })),
    };
  }

  /**
   * Build a game response from Restate in-flight state.
   *
   * @param {InFlightSession} session - session state value.
   * @param {InFlightBoard[]} boards - board state values.
   *
   * @returns {GameResponse} The game response.
   */
  buildGameResponseFromState(
    session: InFlightSession,
    boards: InFlightBoard[],
  ): GameResponse {
    const currentBoard = boards.find(
      (board) => board.roundNumber === session.currentRound,
    );
    const rounds: ScoreboardRound[] = boards
      .filter((board) => board.endedAt !== null)
      .map((board) => ({
        roundNumber: board.roundNumber,
        score: board.score,
        startedAt: board.startedAt,
        endedAt: board.endedAt,
      }));
    const totalScore = rounds.reduce(
      (sum, round) => sum + (round.score ?? 0),
      0,
    );

    return {
      status: session.status,
      sessionId: session.sessionId,
      startedAt: session.startedAt,
      expiryAt: new Date(session.expiryAtMs).toISOString(),
      totalRounds: session.totalRounds,
      board: currentBoard
        ? this.formatBoardResponseFromState(currentBoard)
        : null,
      scoreboard: { totalScore, timeBonus: 0, rounds },
    };
  }

  /**
   * Build a game response from a finalized DB session.
   *
   * @param {NonNullable<Awaited<ReturnType<GameService['fetchFinalizedSession']>>>} dbSession - db session value.
   *
   * @returns {GameResponse} The game response.
   */
  buildGameResponseFromDb(
    dbSession: NonNullable<
      Awaited<ReturnType<typeof this.fetchFinalizedSession>>
    >,
  ): GameResponse {
    const rounds: ScoreboardRound[] = dbSession.sessionBoards.map((board) => ({
      roundNumber: board.roundNumber,
      score: board.score,
      startedAt: board.startedAt.toISOString(),
      endedAt: board.endedAt?.toISOString() ?? null,
    }));
    const totalScore =
      dbSession.score ??
      rounds.reduce((sum, round) => sum + (round.score ?? 0), 0) +
        (dbSession.timeBonus ?? 0);
    return {
      status: dbSession.status,
      sessionId: dbSession.id,
      startedAt: dbSession.startedAt?.toISOString() ?? null,
      expiryAt: dbSession.expiryAt?.toISOString() ?? null,
      totalRounds:
        dbSession.stageConfigSnapshot?.levelConfigs.reduce(
          (sum, l) => sum + l.boardCount,
          0,
        ) ?? dbSession.sessionBoards.length,
      board: null,
      scoreboard: { totalScore, timeBonus: dbSession.timeBonus ?? 0, rounds },
    };
  }

  // ── Move replay ───────────────────────────────────────────────────────────

  /**
   * Replay moves against in-flight board state.
   *
   * @param {{ row: number; col: number; blockType: number; action: 'place' | 'remove'; placedAt: Date }[]} moves - move values.
   * @param {InFlightBoard} board - board state value.
   *
   * @returns {ReturnType<typeof replayMoves>} The replay result.
   */
  replayMovesAgainstState(moves: MoveInput[], board: InFlightBoard) {
    return replayMoves(moves, board.blocks, board.cells);
  }

  // ── Pure utilities ────────────────────────────────────────────────────────

  /**
   * Calculate score for a single board using server-side laser simulation.
   *
   * @param {InFlightBoard} board - board state value.
   *
   * @returns {number} The round score.
   */
  calculateRoundScoreForBoard(board: InFlightBoard): number {
    return calculateRoundScore(this.isBoardSolved(board));
  }

  /**
   * Resolve the level id for a round using the stage level config.
   *
   * @param {number} roundNumber - round number value.
   * @param {{ levelId: string; boardCount: number; order: number }[]} levelConfigs - level config values.
   *
   * @returns {string} The level id.
   */
  getLevelForRound(
    roundNumber: number,
    levelConfigs: { levelId: string; boardCount: number; order: number }[],
  ): string {
    const sorted = [...levelConfigs].sort(
      (prev, next) => prev.order - next.order,
    );
    let remaining = roundNumber;
    for (const levelConfig of sorted) {
      if (remaining <= levelConfig.boardCount) {
        return levelConfig.levelId;
      }
      remaining -= levelConfig.boardCount;
    }
    throw new TerminalError("ROUND_NUMBER_EXCEEDS_TOTAL_ROUNDS", {
      errorCode: 422,
    });
  }

  // ── Anti-cheat (runs at finalize, fire-and-forget) ────────────────────────

  /**
   * Run anti-cheat checks after finalization.
   *
   * @param {InFlightSession} session - session state value.
   * @param {InFlightBoard[]} boards - board state values.
   */
  private runAntiCheatOnFinalize(
    session: InFlightSession,
    boards: InFlightBoard[],
  ): void {
    for (const board of boards) {
      if (board.moves.length > 0) {
        const moveInputs = board.moves.map((move: InFlightMove) => ({
          placedAt: new Date(move.placedAt),
          moveId: move.id,
        }));
        const submitFlags = this.detectSubmitMoveFlags(
          moveInputs,
          null,
          null,
          board.moves.map((move) => move.id),
        );
        this.saveCheatFlags(submitFlags, {
          userId: session.userId,
          sessionId: session.sessionId,
          sessionBoardId: board.id,
        });
      }

      if (board.endedAt) {
        const endFlags = this.detectEndBoardFlagsFromState(
          board,
          session.status,
        );
        this.saveCheatFlags(endFlags, {
          userId: session.userId,
          sessionId: session.sessionId,
          sessionBoardId: board.id,
        });
      }
    }
  }

  /**
   * Save anti-cheat flags.
   *
   * @param {{ flagType: number; evidence: object }[]} flags - flag values.
   * @param {{ userId: string; sessionId: string; sessionBoardId: string }} ctx - cheat flag context value.
   */
  private saveCheatFlags(
    flags: { flagType: number; evidence: object }[],
    ctx: { userId: string; sessionId: string; sessionBoardId: string },
  ): void {
    if (flags.length === 0) {
      return;
    }
    this.persistAndPublishCheatFlags(flags, ctx).catch((err: unknown) =>
      this.logger.error("[anti-cheat] fire-and-forget rejected", {
        err: err instanceof Error ? err.message : String(err),
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        sessionBoardId: ctx.sessionBoardId,
      }),
    );
  }

  /**
   * Persist anti-cheat flags, then publish each created row to SNS.
   *
   * @param {{ flagType: number; evidence: object }[]} flags - flag values.
   * @param {{ userId: string; sessionId: string; sessionBoardId: string }} ctx - cheat flag context value.
   */
  private async persistAndPublishCheatFlags(
    flags: { flagType: number; evidence: object }[],
    ctx: { userId: string; sessionId: string; sessionBoardId: string },
  ): Promise<void> {
    try {
      const createdFlags = await this.prisma.cheatFlag.createManyAndReturn({
        data: flags.map((flag) => ({
          userId: ctx.userId,
          sessionId: ctx.sessionId,
          sessionBoardId: ctx.sessionBoardId,
          flagType: flag.flagType,
          evidence: flag.evidence,
        })),
        select: {
          id: true,
          userId: true,
          flagType: true,
          createdAt: true,
        },
      });

      await Promise.all(
        createdFlags.map((flag) =>
          this.sns.publishCheatFlag({
            referenceId: flag.id,
            userId: flag.userId,
            gameType: config.gameType,
            flagType: flag.flagType,
            createdAt: flag.createdAt.toISOString(),
          }),
        ),
      );
    } catch (err) {
      this.logger.error(
        `[${ctx.userId}] Failed to save cheat flags: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Detect anti-cheat flags from submitted moves (timing analysis).
   *
   * @param {{ placedAt: Date; moveId: string }[]} moves - move values.
   * @param {Date | null} lastMoveAt - previous move timestamp value.
   * @param {string | null} lastMoveId - previous move id value.
   * @param {string[]} moveIds - move id values.
   *
   * @returns {{ flagType: number; evidence: object }[]} The detected flags.
   */
  private detectSubmitMoveFlags(
    moves: { placedAt: Date; moveId: string }[],
    lastMoveAt: Date | null,
    lastMoveId: string | null,
    moveIds: string[],
  ): { flagType: number; evidence: object }[] {
    const flags: { flagType: number; evidence: object }[] = [];
    const timestamps = moves.map((move) => move.placedAt.getTime());
    const allIntervals: {
      fromMoveId: string | null;
      toMoveId: string;
      from: string;
      to: string;
      ms: number;
    }[] = [];

    if (lastMoveAt) {
      allIntervals.push({
        fromMoveId: lastMoveId,
        toMoveId: moveIds[0],
        from: lastMoveAt.toISOString(),
        to: moves[0].placedAt.toISOString(),
        ms: timestamps[0] - lastMoveAt.getTime(),
      });
    }
    for (let i = 1; i < moves.length; i++) {
      allIntervals.push({
        fromMoveId: moveIds[i - 1],
        toMoveId: moveIds[i],
        from: moves[i - 1].placedAt.toISOString(),
        to: moves[i].placedAt.toISOString(),
        ms: timestamps[i] - timestamps[i - 1],
      });
    }

    const tooFast = allIntervals.filter(
      (iv) => iv.ms < ANTI_CHEAT_CONFIGS.CLICK_TOO_FAST_MS,
    );
    if (tooFast.length > 0) {
      flags.push({
        flagType: CHEAT_FLAG_TYPE.CLICK_TOO_FAST,
        evidence: {
          thresholdMs: ANTI_CHEAT_CONFIGS.CLICK_TOO_FAST_MS,
          violations: tooFast,
        },
      });
    }

    if (
      allIntervals.length >= ANTI_CHEAT_CONFIGS.UNIFORM_TIMING_MIN_INTERVALS
    ) {
      const vals = allIntervals.map((iv) => iv.ms);
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      const stddev = Math.sqrt(
        vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length,
      );
      const cv = mean > 0 ? stddev / mean : 0;
      if (cv < ANTI_CHEAT_CONFIGS.UNIFORM_TIMING_CV_THRESHOLD) {
        flags.push({
          flagType: CHEAT_FLAG_TYPE.UNIFORM_TIMING,
          evidence: {
            intervals: allIntervals,
            mean: Math.round(mean),
            stddev: Math.round(stddev),
            cv: +cv.toFixed(4),
          },
        });
      }
    }

    return flags;
  }

  /**
   * Detect anti-cheat flags from end-board state (impossible solve time).
   *
   * @param {InFlightBoard} board - board state value.
   * @param {number} sessionStatus - in-flight session status at finalization.
   *
   * @returns {{ flagType: number; evidence: object }[]} The detected flags.
   */
  private detectEndBoardFlagsFromState(
    board: InFlightBoard,
    sessionStatus: number,
  ): { flagType: number; evidence: object }[] {
    const flags: { flagType: number; evidence: object }[] = [];
    const moveCount = board.moves.length;

    if (board.endedAt && moveCount > 0) {
      const durationMs =
        new Date(board.endedAt).getTime() - new Date(board.startedAt).getTime();
      const thresholdMs =
        moveCount * ANTI_CHEAT_CONFIGS.IMPOSSIBLE_SOLVE_MS_PER_ARROW;
      if (durationMs < thresholdMs) {
        flags.push({
          flagType: CHEAT_FLAG_TYPE.IMPOSSIBLE_SOLVE_TIME,
          evidence: { durationMs, thresholdMs, moveCount, sessionStatus },
        });
      }
    }

    return flags;
  }

  /**
   * Format a board using the board-formatter utility.
   *
   * @param {InFlightBoard} board - board state value.
   *
   * @returns {FormattedLevel} The formatted level.
   */
  formatBoardAsLevel(board: InFlightBoard): FormattedLevel {
    return formatLevel(
      { id: board.boardId, name: null, gridX: board.gridX, gridY: board.gridY },
      board.cells.map((c, i) => ({ ...c, sortOrder: i })),
      board.blocks
        .filter((b) => b.removedAt === null)
        .map((b, i) => ({ ...b, sortOrder: i })),
      board.availableBlocks.map((ab) => ({
        blockType: ab.blockType,
        count: ab.totalCount - ab.usedCount,
      })),
    );
  }
}
