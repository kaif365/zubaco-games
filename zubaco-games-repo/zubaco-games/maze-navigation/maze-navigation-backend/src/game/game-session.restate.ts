import {
  GAME_CONFIGS,
  GAME_SESSION_STATUS,
  RESTATE_SERVICES,
} from "@common/constants";
import * as restate from "@restatedev/restate-sdk";

import type { SubmitMovesDto } from "./dto/submit-moves.dto";
import type { InFlightMaze, InFlightSession } from "./game-restate-state.types";
import { STATE_KEY_MAZES, STATE_KEY_SESSION } from "./game-restate-state.types";
import type { GameService } from "./game.service";

// ── Request shapes ────────────────────────────────────────────────────────────

export interface StartGameRequest {
  userId: string;
  stageId: string;
  clientSeed: string;
}

export interface NextBoardRequest {
  userId: string;
  stageId: string;
}

export interface SubmitMovesRequest {
  userId: string;
  stageId: string;
  dto: SubmitMovesDto;
}

export interface EndBoardRequest {
  userId: string;
  stageId: string;
}

export interface EndGameRequest {
  userId: string;
  stageId: string;
}

export interface GetStatusRequest {
  userId: string;
  stageId: string;
}

export interface MarkResultProcessingRequest {
  sessionId: string;
}

export interface FinalizeExpiredRequest {
  sessionId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Find the current maze by round number.
 *
 * @param {InFlightMaze[]} mazes - maze state values.
 * @param {number} round - round number value.
 *
 * @returns {InFlightMaze | undefined} The current maze, if present.
 */
function currentMaze(
  mazes: InFlightMaze[],
  round: number,
): InFlightMaze | undefined {
  return mazes.find((maze) => maze.roundNumber === round);
}

/**
 * Generate a Restate terminal error with optional API response data.
 *
 * @param {string} message - message key value.
 * @param {number} errorCode - HTTP error code value.
 * @param {Record<string, unknown>} data - optional response data value.
 *
 * @returns {restate.TerminalError} The terminal error.
 */
function generateTerminalError(
  message: string,
  errorCode: number,
  data?: Record<string, unknown>,
): restate.TerminalError {
  return new restate.TerminalError(
    data === undefined ? message : JSON.stringify({ message, data }),
    { errorCode },
  );
}

/**
 * Assert that a Restate session exists.
 *
 * @param {InFlightSession | null} session - session state value.
 */
function assertSession(
  session: InFlightSession | null,
): asserts session is InFlightSession {
  if (!session) {
    throw generateTerminalError("GAME_SESSION_NOT_FOUND", 404, {
      clearData: true,
    });
  }
}

/**
 * Assert that an active maze exists.
 *
 * @param {InFlightMaze | undefined} maze - maze state value.
 */
function assertMaze(
  maze: InFlightMaze | undefined,
): asserts maze is InFlightMaze {
  if (!maze) {
    throw generateTerminalError("NO_ACTIVE_BOARD", 404);
  }
}

/**
 * Assert that a session can accept game actions.
 *
 * @param {InFlightSession} session - session state value.
 * @param {number} nowMs - current Restate time in ms.
 * @param {boolean} allowResultProcessing - whether result-processing status is allowed.
 */
function assertActive(
  session: InFlightSession,
  nowMs: number,
  allowResultProcessing = false,
): void {
  const allowed: number[] = allowResultProcessing
    ? [GAME_SESSION_STATUS.STARTED, GAME_SESSION_STATUS.RESULT_PROCESSING]
    : [GAME_SESSION_STATUS.STARTED];
  if (!allowed.includes(session.status)) {
    throw generateTerminalError("GAME_SESSION_NOT_ACTIVE", 409);
  }
  const graceCutoff =
    session.expiryAtMs + GAME_CONFIGS.SUBMIT_MOVES_EXPIRY_GRACE_SECONDS * 1_000;
  if (nowMs > graceCutoff) {
    throw generateTerminalError("GAME_SESSION_NOT_ACTIVE", 409);
  }
}

/**
 * Assert that the request identity matches the Restate session state.
 *
 * @param {InFlightSession} session - session state value.
 * @param {{ userId: string; stageId: string }} req - request identity value.
 */
function assertRequestMatchesSession(
  session: InFlightSession,
  req: { userId: string; stageId: string },
): void {
  if (req.userId !== session.userId || req.stageId !== session.stageId) {
    throw generateTerminalError("GAME_SESSION_NOT_ACTIVE", 409);
  }
}

/**
 * Check whether all configured rounds were explicitly ended.
 *
 * @param {InFlightSession} session - session state value.
 * @param {InFlightMaze[]} mazes - maze state values.
 *
 * @returns {boolean} Whether the game is fully completed.
 */
function isGameCompleted(
  session: InFlightSession,
  mazes: InFlightMaze[],
): boolean {
  if (mazes.length < session.totalRounds) {
    return false;
  }
  const completedMazes = mazes.filter(
    (m) => m.roundNumber <= session.totalRounds,
  );
  return completedMazes.every((m) => m.reachedEnd && m.endedAt !== null);
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create the Restate virtual object that owns in-flight game session state.
 *
 * @param {GameService} gameService - game service value.
 *
 * @returns {object} The Restate virtual object definition.
 */
export function createGameSessionRestateObject(gameService: GameService) {
  return restate.object({
    name: RESTATE_SERVICES.GAME_SESSION,
    handlers: {
      // ── startGame ─────────────────────────────────────────────────────

      /**
       * Start or re-enter a game session for the Restate object key.
       *
       * @param {restate.ObjectContext} ctx - Restate object context.
       * @param {StartGameRequest} req - start game request value.
       *
       * @returns {Promise<GameResponse>} The asynchronous result.
       */
      startGame: async (ctx: restate.ObjectContext, req: StartGameRequest) => {
        // Re-entry: in-flight state exists
        const existingSession =
          await ctx.get<InFlightSession>(STATE_KEY_SESSION);
        if (existingSession) {
          const mazes = (await ctx.get<InFlightMaze[]>(STATE_KEY_MAZES)) ?? [];
          return gameService.buildGameResponseFromState(existingSession, mazes);
        }

        // Re-entry: game already finalized — check DB
        const finalizedResponse = await ctx.run(
          "check-finalized-session",
          async () => {
            const session = await gameService.fetchFinalizedSession(
              req.userId,
              req.stageId,
            );
            return session
              ? gameService.buildGameResponseFromDb(session)
              : null;
          },
        );
        if (finalizedResponse) {
          return finalizedResponse;
        }

        const existingOpenSession = await ctx.run("check-open-session", () =>
          gameService.fetchOpenSession(req.userId, req.stageId),
        );
        if (existingOpenSession) {
          await ctx.run("expire-stale-session", () =>
            gameService.expireOpenSessionWithoutRestateState(
              existingOpenSession.id,
            ),
          );
        }

        const stageConfig = await ctx.run("fetch-stage-config", () =>
          gameService.fetchStageConfig(req.stageId),
        );

        const { sessionId, expiryAtMs, startedAtMs } = await ctx.run(
          "create-session",
          () =>
            gameService.createGameSession(
              req.userId,
              req.stageId,
              req.clientSeed,
              stageConfig,
            ),
        );

        const totalRounds = stageConfig.levels.reduce(
          (sum: number, level: { boardCount: number }) =>
            sum + level.boardCount,
          0,
        );
        const levelConfigs = stageConfig.levels.map(
          (level: { levelId: string; boardCount: number; order: number }) => ({
            levelId: level.levelId,
            mazeCount: level.boardCount,
            order: level.order,
          }),
        );

        const firstLevelId = levelConfigs[0].levelId;

        // Try fetching a pre-defined template first
        const template = await ctx.run("fetch-template", () =>
          gameService.fetchRandomMazeTemplate(firstLevelId, []),
        );

        let rows, cols;
        if (template) {
          rows = template.rows;
          cols = template.cols;
        } else {
          // Fallback to procedural generation config if no template exists
          const config = await ctx.run("fetch-maze-config", () =>
            gameService.fetchMazeDifficultyConfig(firstLevelId),
          );
          rows = config.rows;
          cols = config.cols;
        }

        const firstInFlightMaze = await ctx.run("build-first-maze", () =>
          gameService.buildInFlightMaze(
            firstLevelId,
            rows,
            cols,
            1,
            req.clientSeed,
            1,
            template,
          ),
        );

        const sessionState: InFlightSession = {
          sessionId,
          userId: req.userId,
          stageId: req.stageId,
          clientSeed: req.clientSeed,
          expiryAtMs,
          timeLimitSeconds: stageConfig.timeLimit,
          totalRounds,
          levelConfigs,
          currentRound: 1,
          status: GAME_SESSION_STATUS.STARTED,
          lastMoveAt: null,
          lastMoveId: null,
          startedAt: new Date(startedAtMs).toISOString(),
          earlyUnlockCount: 0,
        };

        ctx.set(STATE_KEY_SESSION, sessionState);
        ctx.set(STATE_KEY_MAZES, [firstInFlightMaze]);

        await ctx.run("schedule-expiry", () =>
          gameService.scheduleExpiry(
            sessionId,
            expiryAtMs,
            req.userId,
            req.stageId,
          ),
        );

        return gameService.buildGameResponseFromState(sessionState, [
          firstInFlightMaze,
        ]);
      },

      // ── nextBoard ─────────────────────────────────────────────────────

      /**
       * Pre-create and return the next maze once the current maze is unlocked.
       *
       * @param {restate.ObjectContext} ctx - Restate object context.
       * @param {NextBoardRequest} req - next board request value.
       *
       * @returns {Promise<MazeResponse>} The asynchronous result.
       */
      nextBoard: async (ctx: restate.ObjectContext, req: NextBoardRequest) => {
        const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
        assertSession(session);
        assertRequestMatchesSession(session, req);
        assertActive(session, await ctx.date.now());

        const mazes = (await ctx.get<InFlightMaze[]>(STATE_KEY_MAZES)) ?? [];
        const maze = currentMaze(mazes, session.currentRound);
        assertMaze(maze);

        const nextRound = session.currentRound + 1;
        if (nextRound > session.totalRounds) {
          throw generateTerminalError("END_OF_SEQUENCE", 422);
        }

        // Idempotent: maze may already be pre-fetched (either via reachEnd or unlockTile)
        const existing = mazes.find((m) => m.roundNumber === nextRound);

        // Gate check: next maze unlocks when current maze reached end, was already
        // pre-fetched, or the player has early-unlock credits remaining (max 2 per session).
        if (!maze.reachedEnd && !existing) {
          const earlyUnlockCount = session.earlyUnlockCount ?? 0;
          if (earlyUnlockCount >= 2) {
            throw generateTerminalError("NEXT_BOARD_NOT_UNLOCKED", 422);
          }
          ctx.set(STATE_KEY_SESSION, {
            ...session,
            earlyUnlockCount: earlyUnlockCount + 1,
          });
        }

        if (existing) {
          return gameService.formatMazeResponseFromState(existing);
        }

        const levelId = gameService.getLevelForRound(
          nextRound,
          session.levelConfigs,
        );

        // Try fetching a pre-defined template first
        const usedTemplateIds = mazes
          .map((m) => m.templateId)
          .filter((id): id is string => id !== null);
        const template = await ctx.run("fetch-next-template", () =>
          gameService.fetchRandomMazeTemplate(levelId, usedTemplateIds),
        );

        let rows, cols;
        if (template) {
          rows = template.rows;
          cols = template.cols;
        } else {
          // Fallback to procedural generation config if no template exists
          const config = await ctx.run("fetch-next-maze-config", () =>
            gameService.fetchMazeDifficultyConfig(levelId),
          );
          rows = config.rows;
          cols = config.cols;
        }

        const nextInFlightMaze = await ctx.run("build-next-maze", () =>
          gameService.buildInFlightMaze(
            levelId,
            rows,
            cols,
            nextRound,
            session.clientSeed,
            nextRound,
            template,
          ),
        );

        ctx.set(STATE_KEY_MAZES, [...mazes, nextInFlightMaze]);

        return gameService.formatMazeResponseFromState(nextInFlightMaze);
      },

      // ── submitMoves ───────────────────────────────────────────────────

      /**
       * Submit a batch of directional moves for the current active maze.
       *
       * @param {restate.ObjectContext} ctx - Restate object context.
       * @param {SubmitMovesRequest} req - submit moves request value.
       *
       * @returns {Promise<{ accepted: number; startedAt: string; expiryAt: string }>} The asynchronous result.
       */
      submitMoves: async (
        ctx: restate.ObjectContext,
        req: SubmitMovesRequest,
      ) => {
        const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
        assertSession(session);
        const nowMs = await ctx.date.now();
        assertActive(session, nowMs, true);

        const mazes = (await ctx.get<InFlightMaze[]>(STATE_KEY_MAZES)) ?? [];
        const maze = currentMaze(mazes, session.currentRound);
        assertMaze(maze);

        const now = new Date(nowMs);

        // Deduplicate within batch
        const seenInBatch = new Set<string>();
        const dedupedBatch = req.dto.moves.filter((move) => {
          if (seenInBatch.has(move.moveId)) {
            return false;
          }
          seenInBatch.add(move.moveId);
          return true;
        });

        // Filter moves already stored in state
        const existingIds = new Set(maze.moves.map((m) => m.clientMoveId));
        const newMoves = dedupedBatch.filter(
          (move) => !existingIds.has(move.moveId),
        );

        const earlyReturn = {
          accepted: 0,
          startedAt: session.startedAt,
          expiryAt: new Date(session.expiryAtMs).toISOString(),
        };
        if (newMoves.length === 0) {
          return earlyReturn;
        }

        const sortedMoves = newMoves
          .map((move) => ({
            direction: move.direction,
            movedAt: new Date(move.movedAt),
            clientMoveId: move.moveId,
          }))
          .sort((a, b) => a.movedAt.getTime() - b.movedAt.getTime())
          .filter((move) => move.movedAt <= new Date(session.expiryAtMs));

        if (sortedMoves.length === 0) {
          return earlyReturn;
        }

        const minMovedAt = sortedMoves[0].movedAt;
        const maxMovedAt = sortedMoves[sortedMoves.length - 1].movedAt;

        if (session.lastMoveAt && minMovedAt < new Date(session.lastMoveAt)) {
          ctx.console.warn("submitMoves OUT_OF_SEQUENCE: stale move batch", {
            sessionId: session.sessionId,
            minMovedAt: minMovedAt.toISOString(),
            lastMoveAt: session.lastMoveAt,
          });
          throw generateTerminalError("OUT_OF_SEQUENCE", 422);
        }

        const futureSkewMs = maxMovedAt.getTime() - nowMs;
        if (futureSkewMs > GAME_CONFIGS.MOVE_TIMESTAMP_FUTURE_SKEW_MS) {
          ctx.console.warn("submitMoves MOVE_TIMESTAMP_IN_FUTURE", {
            sessionId: session.sessionId,
            futureByMs: futureSkewMs,
          });
          throw generateTerminalError("MOVE_TIMESTAMP_IN_FUTURE", 422);
        }

        // Replay moves against in-state maze data
        const results = gameService.replayMovesAgainstState(sortedMoves, maze);

        // Build new move records
        let newCurrentRow = maze.currentRow;
        let newCurrentCol = maze.currentCol;
        let newReachedEnd = maze.reachedEnd;

        const newMoveRecords = results.map((result, i) => {
          if (result.success) {
            newCurrentRow = result.toRow;
            newCurrentCol = result.toCol;
            if (
              newCurrentRow === maze.endRow &&
              newCurrentCol === maze.endCol
            ) {
              newReachedEnd = true;
            }
          }
          return {
            id: crypto.randomUUID(),
            clientMoveId: sortedMoves[i].clientMoveId,
            direction: result.direction,
            fromRow: result.fromRow,
            fromCol: result.fromCol,
            toRow: result.toRow,
            toCol: result.toCol,
            success: result.success,
            movedAt: result.movedAt.toISOString(),
          };
        });

        const updatedMaze: InFlightMaze = {
          ...maze,
          currentRow: newCurrentRow,
          currentCol: newCurrentCol,
          reachedEnd: newReachedEnd,
          moves: [...maze.moves, ...newMoveRecords],
        };

        const lastMoveRecord = newMoveRecords[newMoveRecords.length - 1];

        ctx.set(
          STATE_KEY_MAZES,
          mazes.map((m) =>
            m.roundNumber === session.currentRound ? updatedMaze : m,
          ),
        );
        ctx.set(STATE_KEY_SESSION, {
          ...session,
          lastMoveAt: maxMovedAt.toISOString(),
          lastMoveId: lastMoveRecord.id,
        });

        // Near-end prefetch: if the player reaches the unlock tile,
        // build the next maze now so nextBoard returns instantly.
        const nextRound = session.currentRound + 1;
        const reachedUnlockTile = newMoveRecords.some(
          (m) =>
            m.success &&
            m.toRow === maze.unlockRow &&
            m.toCol === maze.unlockCol,
        );

        if (
          !newReachedEnd &&
          reachedUnlockTile &&
          session.currentRound < session.totalRounds &&
          !mazes.some((m) => m.roundNumber === nextRound)
        ) {
          const levelId = gameService.getLevelForRound(
            nextRound,
            session.levelConfigs,
          );

          const usedTemplateIds = mazes
            .map((m) => m.templateId)
            .filter((id): id is string => id !== null);
          const template = await ctx.run("fetch-near-end-template", () =>
            gameService.fetchRandomMazeTemplate(levelId, usedTemplateIds),
          );

          let rows: number, cols: number;
          if (template) {
            rows = template.rows;
            cols = template.cols;
          } else {
            const config = await ctx.run("fetch-near-end-maze-config", () =>
              gameService.fetchMazeDifficultyConfig(levelId),
            );
            rows = config.rows;
            cols = config.cols;
          }

          const prefetchedMaze = await ctx.run("build-near-end-maze", () =>
            gameService.buildInFlightMaze(
              levelId,
              rows,
              cols,
              nextRound,
              session.clientSeed,
              nextRound,
              template,
            ),
          );

          const currentMazes = mazes.map((m) =>
            m.roundNumber === session.currentRound ? updatedMaze : m,
          );
          ctx.set(STATE_KEY_MAZES, [...currentMazes, prefetchedMaze]);
        }

        return {
          accepted: results.length,
          startedAt: session.startedAt,
          expiryAt: new Date(session.expiryAtMs).toISOString(),
        };
      },

      // ── endBoard ──────────────────────────────────────────────────────

      /**
       * End the current maze round and advance or finalize the game.
       *
       * @param {restate.ObjectContext} ctx - Restate object context.
       * @param {EndBoardRequest} req - end board request value.
       *
       * @returns {Promise<{ gameOver: boolean; roundScore: number }>} The asynchronous result.
       */
      endBoard: async (ctx: restate.ObjectContext, req: EndBoardRequest) => {
        const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
        assertSession(session);
        assertRequestMatchesSession(session, req);
        const nowMs = await ctx.date.now();
        assertActive(session, nowMs, true);

        const mazes = (await ctx.get<InFlightMaze[]>(STATE_KEY_MAZES)) ?? [];
        const maze = currentMaze(mazes, session.currentRound);
        assertMaze(maze);

        const now = new Date(nowMs);
        const isExpiredCall =
          session.status === GAME_SESSION_STATUS.RESULT_PROCESSING;
        const successfulMoves = maze.moves.filter((m) => m.success).length;
        const roundScore = gameService.calculateRoundScore(
          maze.reachedEnd,
          successfulMoves,
          maze.shortestPathLength,
        );
        const isActualLastRound = session.currentRound >= session.totalRounds;

        const closedMaze: InFlightMaze = {
          ...maze,
          endedAt: now.toISOString(),
          score: roundScore,
        };
        const updatedMazes = mazes.map((m) =>
          m.roundNumber === session.currentRound ? closedMaze : m,
        );

        if (isExpiredCall) {
          if (isActualLastRound) {
            ctx.set(STATE_KEY_MAZES, updatedMazes);
            await ctx.run("finalize-on-expire", () =>
              gameService.finalizeAndCommit(
                session,
                updatedMazes,
                now,
                maze.reachedEnd
                  ? GAME_SESSION_STATUS.ENDED
                  : GAME_SESSION_STATUS.EXPIRED,
              ),
            );
            ctx.clearAll();
            return gameService.buildEndBoardResponse(
              true,
              roundScore,
              updatedMazes,
            );
          }
          const nextRound = session.currentRound + 1;
          let resultProcessingMazes = updatedMazes;
          const updatedSession = { ...session, currentRound: nextRound };

          const prefetched = mazes.find((m) => m.roundNumber === nextRound);
          if (!prefetched && nextRound <= session.totalRounds) {
            const levelId = gameService.getLevelForRound(
              nextRound,
              session.levelConfigs,
            );

            // Try template first
            const usedTemplateIds = updatedMazes
              .map((m) => m.templateId)
              .filter((id): id is string => id !== null);
            const template = await ctx.run(
              "fetch-template-on-expired-end",
              () =>
                gameService.fetchRandomMazeTemplate(levelId, usedTemplateIds),
            );

            let rows, cols;
            if (template) {
              rows = template.rows;
              cols = template.cols;
            } else {
              const config = await ctx.run(
                "fetch-maze-config-on-expired-end",
                () => gameService.fetchMazeDifficultyConfig(levelId),
              );
              rows = config.rows;
              cols = config.cols;
            }

            const nextInFlightMaze = await ctx.run(
              "build-maze-on-expired-end",
              () =>
                gameService.buildInFlightMaze(
                  levelId,
                  rows,
                  cols,
                  nextRound,
                  session.clientSeed,
                  nextRound,
                  template,
                ),
            );
            resultProcessingMazes = [...updatedMazes, nextInFlightMaze];
          }
          ctx.set(STATE_KEY_MAZES, resultProcessingMazes);
          ctx.set(STATE_KEY_SESSION, updatedSession);
          return gameService.buildEndBoardResponse(
            false,
            roundScore,
            updatedMazes,
          );
        }

        // Normal STARTED path — last round
        if (isActualLastRound) {
          ctx.set(STATE_KEY_MAZES, updatedMazes);
          await ctx.run("finalize-last-round", () =>
            gameService.finalizeAndCommit(
              session,
              updatedMazes,
              now,
              GAME_SESSION_STATUS.ENDED,
            ),
          );
          ctx.clearAll();
          return gameService.buildEndBoardResponse(
            true,
            roundScore,
            updatedMazes,
          );
        }

        // Advance round
        const nextRound = session.currentRound + 1;
        const updatedSession = { ...session, currentRound: nextRound };

        const prefetched = mazes.find((m) => m.roundNumber === nextRound);
        if (!prefetched) {
          const levelId = gameService.getLevelForRound(
            nextRound,
            session.levelConfigs,
          );

          // Try template first
          const usedTemplateIds = updatedMazes
            .map((m) => m.templateId)
            .filter((id): id is string => id !== null);
          const template = await ctx.run("fetch-template-on-end", () =>
            gameService.fetchRandomMazeTemplate(levelId, usedTemplateIds),
          );

          let rows, cols;
          if (template) {
            rows = template.rows;
            cols = template.cols;
          } else {
            const config = await ctx.run("fetch-maze-config-on-end", () =>
              gameService.fetchMazeDifficultyConfig(levelId),
            );
            rows = config.rows;
            cols = config.cols;
          }

          const nextInFlightMaze = await ctx.run("build-maze-on-end", () =>
            gameService.buildInFlightMaze(
              levelId,
              rows,
              cols,
              nextRound,
              session.clientSeed,
              nextRound,
              template,
            ),
          );
          ctx.set(STATE_KEY_MAZES, [...updatedMazes, nextInFlightMaze]);
        } else {
          ctx.set(STATE_KEY_MAZES, updatedMazes);
        }

        ctx.set(STATE_KEY_SESSION, updatedSession);
        return gameService.buildEndBoardResponse(
          false,
          roundScore,
          updatedMazes,
        );
      },

      // ── endGame ───────────────────────────────────────────────────────

      /**
       * Finalize the game from the current in-flight state.
       *
       * @param {restate.ObjectContext} ctx - Restate object context.
       * @param {EndGameRequest} req - end game request value.
       *
       * @returns {Promise<{ status: number; totalScore: number; timeBonus: number }>} The asynchronous result.
       */
      endGame: async (ctx: restate.ObjectContext, req: EndGameRequest) => {
        const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
        assertSession(session);
        assertRequestMatchesSession(session, req);
        const nowMs = await ctx.date.now();
        assertActive(session, nowMs, true);

        const mazes = (await ctx.get<InFlightMaze[]>(STATE_KEY_MAZES)) ?? [];
        const now = new Date(nowMs);
        const hintStatus =
          nowMs >= session.expiryAtMs
            ? GAME_SESSION_STATUS.EXPIRED
            : isGameCompleted(session, mazes)
              ? GAME_SESSION_STATUS.ENDED
              : GAME_SESSION_STATUS.MANUALLY_ENDED;

        await ctx.run("finalize-end-game", () =>
          gameService.finalizeAndCommit(session, mazes, now, hintStatus),
        );
        ctx.clearAll();
        return gameService.buildFinalizeResult(session, mazes, now, hintStatus);
      },

      // ── getStatus ─────────────────────────────────────────────────────

      /**
       * Get current game status from Restate state or finalized DB state.
       *
       * @param {restate.ObjectContext} ctx - Restate object context.
       * @param {GetStatusRequest} req - get status request value.
       *
       * @returns {Promise<GameResponse>} The asynchronous result.
       */
      getStatus: async (ctx: restate.ObjectContext, req: GetStatusRequest) => {
        const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
        if (session) {
          const mazes = (await ctx.get<InFlightMaze[]>(STATE_KEY_MAZES)) ?? [];
          return gameService.buildGameResponseFromState(session, mazes);
        }

        const dbResponse = await ctx.run("fetch-status-from-db", async () => {
          const session = await gameService.fetchFinalizedSession(
            req.userId,
            req.stageId,
          );
          return session ? gameService.buildGameResponseFromDb(session) : null;
        });
        if (!dbResponse) {
          throw generateTerminalError("GAME_SESSION_NOT_FOUND", 404, {
            clearData: true,
          });
        }
        return dbResponse;
      },

      // ── markResultProcessing ─────────────────────────────────────────

      /**
       * Mark an active session as result-processing after game expiry.
       *
       * @param {restate.ObjectContext} ctx - Restate object context.
       * @param {MarkResultProcessingRequest} req - mark result-processing request value.
       *
       * @returns {Promise<void>} Resolves when state is updated.
       */
      markResultProcessing: async (
        ctx: restate.ObjectContext,
        req: MarkResultProcessingRequest,
      ) => {
        const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
        if (!session) {
          ctx.console.warn(
            `markResultProcessing: state already cleared for session ${req.sessionId}`,
          );
          return;
        }
        if (session.status !== GAME_SESSION_STATUS.STARTED) {
          return;
        }

        ctx.set(STATE_KEY_SESSION, {
          ...session,
          status: GAME_SESSION_STATUS.RESULT_PROCESSING,
        });
      },

      // ── finalizeExpired ───────────────────────────────────────────────

      /**
       * Finalize an expired session after the move submission grace period.
       *
       * @param {restate.ObjectContext} ctx - Restate object context.
       * @param {FinalizeExpiredRequest} req - finalize expired request value.
       *
       * @returns {Promise<void>} Resolves when finalization completes.
       */
      finalizeExpired: async (
        ctx: restate.ObjectContext,
        req: FinalizeExpiredRequest,
      ) => {
        const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
        if (!session) {
          const settled = await ctx.run("finalize-missing-state", () =>
            gameService.expireOpenSessionWithoutRestateState(req.sessionId),
          );
          if (!settled) {
            ctx.console.warn(
              `finalizeExpired: state already cleared for session ${req.sessionId}`,
            );
          }
          return;
        }

        const mazes = (await ctx.get<InFlightMaze[]>(STATE_KEY_MAZES)) ?? [];
        const now = new Date(await ctx.date.now());

        await ctx.run("finalize-expired", () =>
          gameService.finalizeAndCommit(
            session,
            mazes,
            now,
            GAME_SESSION_STATUS.EXPIRED,
          ),
        );
        ctx.clearAll();
      },
    },
  });
}

export type GameSessionRestateObject = ReturnType<
  typeof createGameSessionRestateObject
>;

export const GAME_SESSION_RESTATE_TARGET = {
  name: RESTATE_SERVICES.GAME_SESSION,
} as GameSessionRestateObject;
