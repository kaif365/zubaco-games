import {
  GAME_SESSION_STATUS,
  ANTI_CHEAT_CONFIGS,
  CHEAT_FLAG_TYPE,
  DEFAULT_STAGE_CONFIG,
  INT32_MIN,
  INT32_MAX,
  GAME_CONFIGS,
} from "@common/constants";
import { config } from "@common/config/env.config";
import { PrismaService } from "@common/prisma/prisma.service";
import { SnsService } from "../aws/sns.service";
import { SqsService } from "../aws/sqs.service";
import { createHash } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { TerminalError } from "@restatedev/restate-sdk";

import { GameExpiryService } from "./game-expiry.service";
import {
  InFlightMaze,
  InFlightMazeMove,
  InFlightSession,
} from "./game-restate-state.types";
import {
  generateMaze,
  generateServerSeed,
  computeFinalSeed,
  computeShortestPath,
  findShortestPath,
} from "./utils/maze-generator";
import { validateMazeMove } from "./utils/move-validator";
import { calculateRoundScore, calculateTimeBonus } from "./utils/score.util";

// ── Response shapes ───────────────────────────────────────────────────────────

export interface MazeResponse {
  sessionMazeId: string;
  levelId: string;
  roundNumber: number;
  rows: number;
  cols: number;
  serverSeedHash: string;
  mazeGrid: number[][];
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  shortestPathLength: number;
  currentRow: number;
  currentCol: number;
  unlockRow: number | null;
  unlockCol: number | null;
  reachedEnd: boolean;
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
  completedBoards: number;
  maze: MazeResponse | null;
  scoreboard: Scoreboard;
}

export type StartGameResponse = GameResponse;

export interface EndBoardResponse {
  gameOver: boolean;
  roundScore: number;
  totalScore: number;
  scoreboard: Scoreboard;
}

const TERMINAL_GAME_SESSION_STATUSES = [
  GAME_SESSION_STATUS.ENDED,
  GAME_SESSION_STATUS.EXPIRED,
  GAME_SESSION_STATUS.MANUALLY_ENDED,
] as const;

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
   * @param {SqsService} sqs - sqs service value.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly expiry: GameExpiryService,
    private readonly sns: SnsService,
    private readonly sqs: SqsService,
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
    const existing = await this.prisma.stageConfig.findFirst({
      where: { stageId, deletedAt: null },
      include: {
        levels: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          include: { level: { select: { id: true, name: true } } },
        },
      },
    });

    if (existing && existing.levels.length > 0) {
      return existing;
    }

    // No config found — provision a default one so the game can always start
    this.logger.warn(
      `[${stageId}] StageConfig missing — creating default config`,
    );
    const stageConfig = await this.provisionDefaultStageConfig(stageId);

    // Notify via SQS so admins can replace the auto-generated config
    void this.sqs.sendMessage({
      eventType: "DEFAULT_STAGE_CONFIG_CREATED",
      stageId,
      gameType: config.gameType,
      createdAt: new Date().toISOString(),
    });

    return stageConfig;
  }

  /**
   * Create a default StageConfig linked to all existing levels (one board each).
   *
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<object>} The created stage config with levels.
   */
  private async provisionDefaultStageConfig(stageId: string) {
    return this.prisma.$transaction(async (tx) => {
      const levels = await tx.level.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      if (levels.length === 0) {
        throw new TerminalError("NO_LEVELS_FOUND", { errorCode: 404 });
      }

      const created = await tx.stageConfig.create({
        data: {
          stageId,
          timeLimit: DEFAULT_STAGE_CONFIG.TIME_LIMIT_SECONDS,
          levels: {
            create: levels.map((level, index) => ({
              levelId: level.id,
              boardCount: DEFAULT_STAGE_CONFIG.BOARD_COUNT,
              order: index + 1,
            })),
          },
        },
        include: {
          levels: {
            where: { deletedAt: null },
            orderBy: { order: "asc" },
            include: { level: { select: { id: true, name: true } } },
          },
        },
      });

      return created;
    });
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
        sessionMazes: {
          where: { deletedAt: null },
          orderBy: { roundNumber: "asc" },
        },
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
   * @param {string} clientSeed - client seed value.
   * @param {Awaited<ReturnType<GameService['fetchStageConfig']>>} stageConfig - stage config value.
   *
   * @returns {Promise<{ sessionId: string; expiryAtMs: number; startedAtMs: number }>} The asynchronous result.
   */
  async createGameSession(
    userId: string,
    stageId: string,
    clientSeed: string,
    stageConfig: Awaited<ReturnType<typeof this.fetchStageConfig>>,
  ): Promise<{ sessionId: string; expiryAtMs: number; startedAtMs: number }> {
    const now = new Date();
    const expiryAt = new Date(now.getTime() + stageConfig.timeLimit * 1_000);

    const session = await this.prisma.$transaction(async (tx) => {
      const stale = await tx.gameSession.findFirst({
        where: {
          userId,
          stageId,
          status: {
            notIn: [
              GAME_SESSION_STATUS.STARTED,
              GAME_SESSION_STATUS.RESULT_PROCESSING,
            ],
          },
        },
        select: { id: true },
      });
      if (stale) {
        const stageConfig = await tx.gameSessionStageConfig.findUnique({
          where: { sessionId: stale.id },
          select: { id: true },
        });
        if (stageConfig) {
          await tx.gameSessionStageLevelConfig.deleteMany({
            where: { sessionStageConfigId: stageConfig.id },
          });
          await tx.gameSessionStageConfig.delete({
            where: { id: stageConfig.id },
          });
        }
        const mazeIds = await tx.gameSessionMaze.findMany({
          where: { sessionId: stale.id },
          select: { id: true },
        });
        if (mazeIds.length) {
          const ids = mazeIds.map((m) => m.id);
          await tx.cheatFlag.deleteMany({
            where: { sessionMazeId: { in: ids } },
          });
          await tx.gameMove.deleteMany({ where: { sessionId: stale.id } });
          await tx.gameSessionMaze.deleteMany({
            where: { sessionId: stale.id },
          });
        }
        await tx.gameSession.delete({ where: { id: stale.id } });
      }
      return tx.gameSession.create({
        data: {
          userId,
          stageId,
          clientSeed,
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
                    mazeCount: level.boardCount,
                    order: level.order,
                  })),
                },
              },
            },
          },
        },
      });
    });

    return {
      sessionId: session.id,
      expiryAtMs: expiryAt.getTime(),
      startedAtMs: now.getTime(),
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
   * Fetch maze difficulty config for a level.
   *
   * @param {string} levelId - level id value.
   *
   * @returns {Promise<{ rows: number; cols: number }>} The maze dimensions.
   */
  async fetchMazeDifficultyConfig(
    levelId: string,
  ): Promise<{ rows: number; cols: number }> {
    const cfg = await this.prisma.mazeDifficultyConfig.findFirst({
      where: { levelId, deletedAt: null },
    });
    if (!cfg) {
      throw new TerminalError("NO_MAZES_AVAILABLE_FOR_LEVEL", {
        errorCode: 404,
      });
    }
    return { rows: cfg.rows, cols: cfg.cols };
  }

  /**
   * Fetch a random maze template for a level.
   *
   * @param {string} levelId - level id value.
   *
   * @returns {Promise<any | null>} The maze template.
   */
  async fetchRandomMazeTemplate(levelId: string, excludeIds: string[] = []) {
    const where = {
      levelId,
      deletedAt: null,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    };
    const count = await this.prisma.mazeTemplate.count({ where });
    if (count === 0) {
      return null;
    }
    const skip = Math.floor(Math.random() * count);
    return this.prisma.mazeTemplate.findFirst({ where, skip });
  }

  /**
   * Build an InFlightMaze for a round.
   * If a template is provided, it uses the template grid.
   * Otherwise, it generates a new maze using the seeds.
   *
   * @param {string} levelId - level id value.
   * @param {number} rows - maze rows value.
   * @param {number} cols - maze cols value.
   * @param {number} roundNumber - round number value.
   * @param {string} clientSeed - client seed value.
   * @param {number} nonce - nonce value (= roundNumber).
   * @param {any} template - optional maze template value.
   *
   * @returns {Promise<InFlightMaze>} The in-flight maze state.
   */
  async buildInFlightMaze(
    levelId: string,
    rows: number,
    cols: number,
    roundNumber: number,
    clientSeed: string,
    nonce: number,
    template?: any,
  ): Promise<InFlightMaze> {
    const serverSeed = generateServerSeed();
    const serverSeedHash = createHash("sha256")
      .update(serverSeed)
      .digest("hex");
    const finalSeed = computeFinalSeed(serverSeed, clientSeed, nonce);

    let mazeGrid: number[][];
    let startRow = 1;
    let startCol = 1;
    let endRow = rows - 2;
    let endCol = cols - 2;

    if (template) {
      mazeGrid = template.grid as number[][];
      startRow = template.startRow;
      startCol = template.startCol;
      endRow = template.endRow;
      endCol = template.endCol;
    } else {
      mazeGrid = generateMaze(rows, cols, finalSeed);
    }

    const shortestPathLength = computeShortestPath(
      mazeGrid,
      startRow,
      startCol,
      endRow,
      endCol,
    );
    const path = findShortestPath(mazeGrid, startRow, startCol, endRow, endCol);
    const now = new Date().toISOString();

    // Unlock tile: pick a point on the shortest path that is prefetch distance away from end
    let unlockRow: number | null = null;
    let unlockCol: number | null = null;

    if (path.length > 0) {
      // path includes start and end. Index 0 is start, Index length-1 is end.
      // We want a point that is NEAR_END_PREFETCH_DISTANCE steps BEFORE the end.
      const targetIndex = Math.max(
        0,
        path.length - 1 - GAME_CONFIGS.NEAR_END_PREFETCH_DISTANCE,
      );
      [unlockRow, unlockCol] = path[targetIndex];
    }

    return {
      id: crypto.randomUUID(),
      levelId,
      rows: template ? template.rows : rows,
      cols: template ? template.cols : cols,
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
      finalSeed,
      mazeGrid,
      startRow,
      startCol,
      endRow,
      endCol,
      shortestPathLength: shortestPathLength > 0 ? shortestPathLength : 1,
      roundNumber,
      startedAt: now,
      endedAt: null,
      score: null,
      currentRow: startRow,
      currentCol: startCol,
      unlockRow,
      unlockCol,
      templateId: template ? template.id : null,
      reachedEnd: false,
      moves: [],
    };
  }

  // ── Finalization ──────────────────────────────────────────────────────────

  /**
   * Commit the full in-flight game to the DB in a single transaction.
   *
   * @param {InFlightSession} session - session state value.
   * @param {InFlightMaze[]} mazes - maze state values.
   * @param {Date} now - current date value.
   * @param {number} hintStatus - fallback final status value.
   *
   * @returns {Promise<{ status: number; totalScore: number; timeBonus: number }>} The asynchronous result.
   */
  async finalizeAndCommit(
    session: InFlightSession,
    mazes: InFlightMaze[],
    now: Date,
    hintStatus: number,
  ): Promise<{ status: number; totalScore: number; timeBonus: number }> {
    // Score any maze that wasn't explicitly closed
    const scoredMazes: InFlightMaze[] = mazes.map((maze) => {
      if (maze.score !== null) {
        return maze;
      }
      const successfulMoves = maze.moves.filter((m) => m.success).length;
      return {
        ...maze,
        score: calculateRoundScore(
          maze.reachedEnd,
          successfulMoves,
          maze.shortestPathLength,
        ),
        endedAt: maze.endedAt ?? now.toISOString(),
      };
    });

    const lastMaze = scoredMazes.find(
      (m) => m.roundNumber === session.totalRounds,
    );
    const lastReachedEnd = lastMaze !== undefined && lastMaze.reachedEnd;
    const allRoundsDone =
      scoredMazes.filter((m) => m.endedAt !== null).length >=
      session.totalRounds;

    const finalStatus =
      hintStatus === GAME_SESSION_STATUS.EXPIRED
        ? GAME_SESSION_STATUS.EXPIRED
        : hintStatus === GAME_SESSION_STATUS.ENDED &&
            allRoundsDone &&
            lastReachedEnd
          ? GAME_SESSION_STATUS.ENDED
          : hintStatus;

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

    const roundsScore = scoredMazes.reduce(
      (sum, maze) => sum + (maze.score ?? 0),
      0,
    );
    const totalScore = roundsScore + timeBonus;
    this.assertPersistableInt("gameSession.status", finalStatus);
    this.assertPersistableInt("gameSession.score", totalScore);
    this.assertPersistableInt("gameSession.timeBonus", timeBonus);
    this.assertPersistableSnapshotInts(scoredMazes);
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
      if (!existingSession) {
        this.logger.warn(
          `Session ${session.sessionId} not found during finalization. Skipping update.`,
        );
        existingFinalizeResult = {
          status: finalStatus,
          totalScore: totalScore,
          timeBonus: timeBonus,
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

      await tx.gameSession.update({
        where: { id: session.sessionId },
        data: {
          status: finalStatus,
          endedAt: now,
          score: totalScore,
          timeBonus,
        },
      });

      await tx.gameSessionMaze.createMany({
        data: scoredMazes.map((maze) => ({
          id: maze.id,
          sessionId: session.sessionId,
          roundNumber: maze.roundNumber,
          levelId: maze.levelId,
          rows: maze.rows,
          cols: maze.cols,
          serverSeed: maze.serverSeed,
          serverSeedHash: maze.serverSeedHash,
          clientSeed: maze.clientSeed,
          nonce: maze.nonce,
          finalSeed: maze.finalSeed,
          mazeGrid: maze.mazeGrid,
          startRow: maze.startRow,
          startCol: maze.startCol,
          endRow: maze.endRow,
          endCol: maze.endCol,
          shortestPathLength: maze.shortestPathLength,
          reachedEnd: maze.reachedEnd,
          isActive: false,
          score: maze.score,
          startedAt: new Date(maze.startedAt),
          endedAt: maze.endedAt ? new Date(maze.endedAt) : now,
        })),
        skipDuplicates: true,
      });

      if (scoredMazes.some((maze) => maze.moves.length > 0)) {
        await tx.gameMove.createMany({
          data: scoredMazes.flatMap((maze) =>
            maze.moves.map((move) => ({
              id: move.id,
              sessionId: session.sessionId,
              sessionMazeId: maze.id,
              clientMoveId: move.clientMoveId,
              direction: move.direction,
              fromRow: move.fromRow,
              fromCol: move.fromCol,
              toRow: move.toRow,
              toCol: move.toCol,
              success: move.success,
              movedAt: new Date(move.movedAt),
            })),
          ),
          skipDuplicates: true,
        });
      }
    });

    if (existingFinalizeResult) {
      return existingFinalizeResult;
    }

    await this.verifyFinalizedSnapshotCounts(
      session.sessionId,
      scoredMazes.length,
      scoredMazes.reduce((sum, maze) => sum + maze.moves.length, 0),
    );

    // Anti-cheat — fire-and-forget
    this.runAntiCheatOnFinalize(session, scoredMazes);

    this.logger.log(
      `Session ${session.sessionId} finalized: status=${finalStatus} score=${totalScore} timeBonus=${timeBonus}`,
    );

    return { status: finalStatus, totalScore, timeBonus };
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
   * Build a finalize response without writing to the database.
   *
   * @param {InFlightSession} session - session state value.
   * @param {InFlightMaze[]} mazes - maze state values.
   * @param {Date} now - current date value.
   * @param {number} hintStatus - fallback final status value.
   *
   * @returns {{ status: number; totalScore: number; timeBonus: number }} The finalize result.
   */
  buildFinalizeResult(
    session: InFlightSession,
    mazes: InFlightMaze[],
    now: Date,
    hintStatus: number,
  ): { status: number; totalScore: number; timeBonus: number } {
    const lastMaze = mazes.find((m) => m.roundNumber === session.totalRounds);
    const lastReachedEnd = lastMaze !== undefined && lastMaze.reachedEnd;
    const allRoundsDone =
      mazes.filter((m) => m.endedAt !== null).length >= session.totalRounds;
    const finalStatus =
      hintStatus === GAME_SESSION_STATUS.EXPIRED
        ? GAME_SESSION_STATUS.EXPIRED
        : hintStatus === GAME_SESSION_STATUS.ENDED &&
            allRoundsDone &&
            lastReachedEnd
          ? GAME_SESSION_STATUS.ENDED
          : hintStatus;
    const timeBonus =
      finalStatus === GAME_SESSION_STATUS.ENDED
        ? calculateTimeBonus(
            session.expiryAtMs - now.getTime(),
            session.timeLimitSeconds,
          )
        : 0;
    const totalScore =
      mazes.reduce((sum, m) => sum + (m.score ?? 0), 0) + timeBonus;
    return { status: finalStatus, totalScore, timeBonus };
  }

  // ── Response builders ─────────────────────────────────────────────────────

  /**
   * Build an EndBoardResponse with running scoreboard from updated maze state.
   *
   * @param {boolean} gameOver - whether the game is over.
   * @param {number} roundScore - score for the just-ended board.
   * @param {InFlightMaze[]} updatedMazes - all mazes including the just-closed one.
   *
   * @returns {EndBoardResponse} The end board response.
   */
  buildEndBoardResponse(
    gameOver: boolean,
    roundScore: number,
    updatedMazes: InFlightMaze[],
  ): EndBoardResponse {
    const rounds: ScoreboardRound[] = updatedMazes
      .filter((m) => m.endedAt !== null)
      .map((m) => ({
        roundNumber: m.roundNumber,
        score: m.score,
        startedAt: m.startedAt,
        endedAt: m.endedAt,
      }));
    const totalScore = rounds.reduce((sum, r) => sum + (r.score ?? 0), 0);
    return {
      gameOver,
      roundScore,
      totalScore,
      scoreboard: { totalScore, timeBonus: 0, rounds },
    };
  }

  /**
   * Format an in-flight maze as a client maze response.
   *
   * @param {InFlightMaze} maze - maze state value.
   *
   * @returns {MazeResponse} The maze response.
   */
  formatMazeResponseFromState(maze: InFlightMaze): MazeResponse {
    return {
      sessionMazeId: maze.id,
      levelId: maze.levelId,
      roundNumber: maze.roundNumber,
      rows: maze.rows,
      cols: maze.cols,
      serverSeedHash: maze.serverSeedHash,
      mazeGrid: maze.mazeGrid,
      startRow: maze.startRow,
      startCol: maze.startCol,
      endRow: maze.endRow,
      endCol: maze.endCol,
      shortestPathLength: maze.shortestPathLength,
      currentRow: maze.currentRow,
      currentCol: maze.currentCol,
      unlockRow: maze.unlockRow,
      unlockCol: maze.unlockCol,
      reachedEnd: maze.reachedEnd,
    };
  }

  /**
   * Build a game response from Restate in-flight state.
   *
   * @param {InFlightSession} session - session state value.
   * @param {InFlightMaze[]} mazes - maze state values.
   *
   * @returns {GameResponse} The game response.
   */
  buildGameResponseFromState(
    session: InFlightSession,
    mazes: InFlightMaze[],
  ): GameResponse {
    const currentMaze = mazes.find(
      (m) => m.roundNumber === session.currentRound,
    );
    const rounds: ScoreboardRound[] = mazes
      .filter((m) => m.endedAt !== null)
      .map((m) => ({
        roundNumber: m.roundNumber,
        score: m.score,
        startedAt: m.startedAt,
        endedAt: m.endedAt,
      }));
    const totalScore = rounds.reduce((sum, r) => sum + (r.score ?? 0), 0);
    const completedBoards = mazes.filter(
      (m) => m.reachedEnd && m.endedAt !== null,
    ).length;

    return {
      status: session.status,
      sessionId: session.sessionId,
      startedAt: session.startedAt,
      expiryAt: new Date(session.expiryAtMs).toISOString(),
      totalRounds: session.totalRounds,
      completedBoards,
      maze: currentMaze ? this.formatMazeResponseFromState(currentMaze) : null,
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
    const rounds: ScoreboardRound[] = dbSession.sessionMazes.map((maze) => ({
      roundNumber: maze.roundNumber,
      score: maze.score,
      startedAt: maze.startedAt.toISOString(),
      endedAt: maze.endedAt?.toISOString() ?? null,
    }));
    const totalScore =
      dbSession.score ??
      rounds.reduce((sum, r) => sum + (r.score ?? 0), 0) +
        (dbSession.timeBonus ?? 0);
    const completedBoards = dbSession.sessionMazes.filter(
      (m) => m.endedAt !== null,
    ).length;
    return {
      status: dbSession.status,
      sessionId: dbSession.id,
      startedAt: dbSession.startedAt?.toISOString() ?? null,
      expiryAt: dbSession.expiryAt?.toISOString() ?? null,
      totalRounds: dbSession.sessionMazes.length,
      completedBoards,
      maze: null,
      scoreboard: { totalScore, timeBonus: dbSession.timeBonus ?? 0, rounds },
    };
  }

  // ── Move replay ───────────────────────────────────────────────────────────

  /**
   * Replay directional moves against in-state maze data.
   *
   * @param {{ direction: string; movedAt: Date; clientMoveId: string }[]} moves - move values.
   * @param {InFlightMaze} maze - maze state value.
   *
   * @returns {{ direction: string; fromRow: number; fromCol: number; toRow: number; toCol: number; success: boolean; movedAt: Date }[]} Replay results.
   */
  replayMovesAgainstState(
    moves: { direction: string; movedAt: Date; clientMoveId: string }[],
    maze: InFlightMaze,
  ) {
    let currentRow = maze.currentRow;
    let currentCol = maze.currentCol;

    return moves.map((move) => {
      const fromRow = currentRow;
      const fromCol = currentCol;

      const result = validateMazeMove(
        maze.mazeGrid,
        currentRow,
        currentCol,
        move.direction,
        maze.rows,
        maze.cols,
      );

      if (result.success) {
        currentRow = result.toRow;
        currentCol = result.toCol;
      }

      return {
        direction: move.direction,
        fromRow,
        fromCol,
        toRow: result.toRow,
        toCol: result.toCol,
        success: result.success,
        movedAt: move.movedAt,
      };
    });
  }

  // ── Pure utilities ────────────────────────────────────────────────────────

  /**
   * Calculate score for a single maze round.
   *
   * @param {boolean} reachedEnd - whether the maze end was reached.
   * @param {number} moveCount - successful move count value.
   * @param {number} shortestPathLength - shortest path length value.
   *
   * @returns {number} The round score.
   */
  calculateRoundScore(
    reachedEnd: boolean,
    moveCount: number,
    shortestPathLength: number,
  ): number {
    return calculateRoundScore(reachedEnd, moveCount, shortestPathLength);
  }

  /**
   * Resolve the level id for a round using the stage level config.
   *
   * @param {number} roundNumber - round number value.
   * @param {{ levelId: string; mazeCount: number; order: number }[]} levelConfigs - level config values.
   *
   * @returns {string} The level id.
   */
  getLevelForRound(
    roundNumber: number,
    levelConfigs: { levelId: string; mazeCount: number; order: number }[],
  ): string {
    const sorted = [...levelConfigs].sort((a, b) => a.order - b.order);
    let remaining = roundNumber;
    for (const levelConfig of sorted) {
      if (remaining <= levelConfig.mazeCount) {
        return levelConfig.levelId;
      }
      remaining -= levelConfig.mazeCount;
    }
    throw new TerminalError("ROUND_NUMBER_EXCEEDS_TOTAL_ROUNDS", {
      errorCode: 422,
    });
  }

  // ── Anti-cheat ────────────────────────────────────────────────────────────

  /**
   * Run anti-cheat checks after finalization.
   *
   * @param {InFlightSession} session - session state value.
   * @param {InFlightMaze[]} mazes - maze state values.
   */
  /**
   * Assert that a numeric value fits Prisma integer storage.
   *
   * @param {string} field - field name value.
   * @param {number | null | undefined} value - numeric value.
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
   * Assert that maze and move snapshot integers fit Prisma integer storage.
   *
   * @param {InFlightMaze[]} mazes - maze values.
   */
  private assertPersistableSnapshotInts(mazes: InFlightMaze[]): void {
    for (const maze of mazes) {
      this.assertPersistableInt(
        "gameSessionMaze.roundNumber",
        maze.roundNumber,
      );
      this.assertPersistableInt("gameSessionMaze.rows", maze.rows);
      this.assertPersistableInt("gameSessionMaze.cols", maze.cols);
      this.assertPersistableInt("gameSessionMaze.startRow", maze.startRow);
      this.assertPersistableInt("gameSessionMaze.startCol", maze.startCol);
      this.assertPersistableInt("gameSessionMaze.endRow", maze.endRow);
      this.assertPersistableInt("gameSessionMaze.endCol", maze.endCol);
      this.assertPersistableInt(
        "gameSessionMaze.shortestPathLength",
        maze.shortestPathLength,
      );
      this.assertPersistableInt("gameSessionMaze.score", maze.score);

      for (const move of maze.moves) {
        this.assertPersistableInt("gameMove.fromRow", move.fromRow);
        this.assertPersistableInt("gameMove.fromCol", move.fromCol);
        this.assertPersistableInt("gameMove.toRow", move.toRow);
        this.assertPersistableInt("gameMove.toCol", move.toCol);
      }
    }
  }

  /**
   * Verify finalized snapshot row counts after an idempotent commit.
   *
   * @param {string} sessionId - session id value.
   * @param {number} expectedMazes - expected maze count value.
   * @param {number} expectedMoves - expected move count value.
   */
  private async verifyFinalizedSnapshotCounts(
    sessionId: string,
    expectedMazes: number,
    expectedMoves: number,
  ): Promise<void> {
    const [actualMazes, actualMoves] = await Promise.all([
      this.prisma.gameSessionMaze.count({
        where: { sessionId, deletedAt: null },
      }),
      this.prisma.gameMove.count({ where: { sessionId } }),
    ]);

    const countsMatch =
      actualMazes === expectedMazes && actualMoves === expectedMoves;

    if (!countsMatch) {
      this.logger.error(
        `Session ${sessionId} finalized snapshot count mismatch`,
        {
          expected: { mazes: expectedMazes, moves: expectedMoves },
          actual: { mazes: actualMazes, moves: actualMoves },
        },
      );
      return;
    }

    this.logger.debug(
      `Session ${sessionId} finalized snapshot counts verified: mazes=${actualMazes} moves=${actualMoves}`,
    );
  }

  private runAntiCheatOnFinalize(
    session: InFlightSession,
    mazes: InFlightMaze[],
  ): void {
    for (const maze of mazes) {
      if (maze.moves.length > 0) {
        const submitFlags = this.detectSubmitMoveFlags(maze.moves);
        void this.persistAndPublishCheatFlags(submitFlags, {
          userId: session.userId,
          sessionId: session.sessionId,
          sessionMazeId: maze.id,
        });
      }

      if (maze.endedAt) {
        const endFlags = this.detectEndMazeFlagsFromState(maze);
        void this.persistAndPublishCheatFlags(endFlags, {
          userId: session.userId,
          sessionId: session.sessionId,
          sessionMazeId: maze.id,
        });
      }
    }
  }

  /**
   * Persist anti-cheat flags, then publish each created row to SNS.
   *
   * @param {{ flagType: number; evidence: object }[]} flags - flag values.
   * @param {{ userId: string; sessionId: string; sessionMazeId: string }} ctx - cheat flag context value.
   */
  private async persistAndPublishCheatFlags(
    flags: { flagType: number; evidence: object }[],
    ctx: { userId: string; sessionId: string; sessionMazeId: string },
  ): Promise<void> {
    if (flags.length === 0) {
      return;
    }
    try {
      const createdFlags = await this.prisma.cheatFlag.createManyAndReturn({
        data: flags.map((flag) => ({
          userId: ctx.userId,
          sessionId: ctx.sessionId,
          sessionMazeId: ctx.sessionMazeId,
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
   * Detect anti-cheat flags from submitted moves.
   *
   * @param {InFlightMazeMove[]} moves - move values.
   *
   * @returns {{ flagType: number; evidence: object }[]} The detected flags.
   */
  private detectSubmitMoveFlags(
    moves: InFlightMazeMove[],
  ): { flagType: number; evidence: object }[] {
    const flags: { flagType: number; evidence: object }[] = [];
    if (moves.length < 2) {
      return flags;
    }

    const timestamps = moves.map((m) => new Date(m.movedAt).getTime());
    const allIntervals: { from: string; to: string; ms: number }[] = [];

    for (let i = 1; i < moves.length; i++) {
      allIntervals.push({
        from: moves[i - 1].movedAt,
        to: moves[i].movedAt,
        ms: timestamps[i] - timestamps[i - 1],
      });
    }

    const tooFast = allIntervals.filter(
      (iv) => iv.ms < ANTI_CHEAT_CONFIGS.MOVE_TOO_FAST_MS,
    );
    if (tooFast.length > 0) {
      flags.push({
        flagType: CHEAT_FLAG_TYPE.MOVE_TOO_FAST,
        evidence: {
          thresholdMs: ANTI_CHEAT_CONFIGS.MOVE_TOO_FAST_MS,
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
   * Detect anti-cheat flags from end-maze state.
   *
   * @param {InFlightMaze} maze - maze state value.
   *
   * @returns {{ flagType: number; evidence: object }[]} The detected flags.
   */
  private detectEndMazeFlagsFromState(
    maze: InFlightMaze,
  ): { flagType: number; evidence: object }[] {
    const flags: { flagType: number; evidence: object }[] = [];
    const successfulMoves = maze.moves.filter((m) => m.success).length;

    // IMPOSSIBLE_PATH: reached end with fewer moves than shortest path
    if (maze.reachedEnd && successfulMoves < maze.shortestPathLength) {
      flags.push({
        flagType: CHEAT_FLAG_TYPE.IMPOSSIBLE_PATH,
        evidence: {
          successfulMoves,
          shortestPathLength: maze.shortestPathLength,
        },
      });
    }

    // IMPOSSIBLE_SOLVE_TIME: solved faster than 100ms per move
    if (maze.reachedEnd && maze.endedAt) {
      const durationMs =
        new Date(maze.endedAt).getTime() - new Date(maze.startedAt).getTime();
      const thresholdMs =
        maze.shortestPathLength *
        ANTI_CHEAT_CONFIGS.IMPOSSIBLE_SOLVE_MS_PER_MOVE;
      if (successfulMoves > 0 && durationMs < thresholdMs) {
        flags.push({
          flagType: CHEAT_FLAG_TYPE.IMPOSSIBLE_SOLVE_TIME,
          evidence: {
            durationMs,
            thresholdMs,
            shortestPathLength: maze.shortestPathLength,
            successfulMoves,
          },
        });
      }
    }

    return flags;
  }
}
