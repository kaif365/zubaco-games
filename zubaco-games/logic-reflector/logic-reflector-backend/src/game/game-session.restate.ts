import {
  GAME_CONFIGS,
  GAME_SESSION_STATUS,
  RESTATE_SERVICES,
} from "@common/constants";
import { wrapRestateHandlers } from "@common/utils/restate-tracing.util";
import * as restate from "@restatedev/restate-sdk";

import type { SubmitMovesDto } from "./dto/submit-moves.dto";
import type {
  InFlightBoard,
  InFlightMove,
  InFlightSession,
} from "./game-restate-state.types";
import {
  STATE_KEY_BOARDS,
  STATE_KEY_SESSION,
} from "./game-restate-state.types";
import type { GameService } from "./game.service";
import { verifyRound } from "./utils/verify-round.util";

// ── Request shapes ────────────────────────────────────────────────────────────

export interface StartGameRequest {
  userId: string;
  stageId: string;
}

export interface NextLevelRequest {
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
 * Find the current board by round number.
 *
 * @param {InFlightBoard[]} boards - board state values.
 * @param {number} round - round number value.
 *
 * @returns {InFlightBoard | undefined} The current board, if present.
 */
function currentBoard(
  boards: InFlightBoard[],
  round: number,
): InFlightBoard | undefined {
  return boards.find((board) => board.roundNumber === round);
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
 * Assert that an active board exists.
 *
 * @param {InFlightBoard | undefined} board - board state value.
 */
function assertBoard(
  board: InFlightBoard | undefined,
): asserts board is InFlightBoard {
  if (!board) {
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
 * Check whether all configured rounds were explicitly ended and solved.
 *
 * @param {InFlightSession} session - session state value.
 * @param {InFlightBoard[]} boards - board state values.
 *
 * @returns {boolean} Whether the game is fully completed.
 */
function isGameCompleted(
  session: InFlightSession,
  boards: InFlightBoard[],
): boolean {
  if (boards.length < session.totalRounds) {
    return false;
  }
  const completedBoards = boards.filter(
    (board) => board.roundNumber <= session.totalRounds,
  );
  return completedBoards.every(
    (board) => board.endedAt !== null && board.score === 1000,
  );
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
    handlers: wrapRestateHandlers(RESTATE_SERVICES.GAME_SESSION, {
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
          const boards =
            (await ctx.get<InFlightBoard[]>(STATE_KEY_BOARDS)) ?? [];
          return gameService.buildGameResponseFromState(
            existingSession,
            boards,
          );
        }

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
          throw generateTerminalError("GAME_SESSION_RECOVERY_REQUIRED", 409);
        }

        const stageConfig = await ctx.run("fetch-stage-config", () =>
          gameService.fetchStageConfig(req.stageId),
        );

        const { sessionId, expiryAtMs, startedAtMs } = await ctx.run(
          "create-session",
          () =>
            gameService.createGameSession(req.userId, req.stageId, stageConfig),
        );

        const totalRounds = stageConfig.levels.reduce(
          (sum: number, level: { boardCount: number }) =>
            sum + level.boardCount,
          0,
        );
        const levelConfigs = stageConfig.levels.map(
          (level: { levelId: string; boardCount: number; order: number }) => ({
            levelId: level.levelId,
            boardCount: level.boardCount,
            order: level.order,
          }),
        );

        const demoBoardIds = await ctx.run("fetch-demo-board-ids", () =>
          gameService.fetchDemoBoardIds(req.userId, req.stageId),
        );

        const firstInFlightBoard = await ctx.run("pick-first-board", async () =>
          gameService.buildInFlightBoard(
            await gameService.pickBoardWithData(
              stageConfig.levels[0].levelId,
              demoBoardIds,
            ),
            1,
            true,
          ),
        );

        await ctx.run("schedule-expiry", () =>
          gameService.scheduleExpiry(
            sessionId,
            expiryAtMs,
            req.userId,
            req.stageId,
          ),
        );

        const sessionState: InFlightSession = {
          sessionId,
          userId: req.userId,
          stageId: req.stageId,
          expiryAtMs,
          timeLimitSeconds: stageConfig.timeLimit,
          totalRounds,
          levelConfigs,
          currentRound: 1,
          status: GAME_SESSION_STATUS.STARTED,
          lastMoveAt: null,
          lastMoveId: null,
          usedBoardIds: [...demoBoardIds, firstInFlightBoard.boardId],
          startedAt: new Date(startedAtMs).toISOString(),
        };

        ctx.set(STATE_KEY_SESSION, sessionState);
        ctx.set(STATE_KEY_BOARDS, [firstInFlightBoard]);

        return gameService.buildGameResponseFromState(sessionState, [
          firstInFlightBoard,
        ]);
      },

      // ── nextLevel ─────────────────────────────────────────────────────

      /**
       * Pre-create and return the next level board (no unlock gate for Logic Reflector).
       *
       * @param {restate.ObjectContext} ctx - Restate object context.
       * @param {NextLevelRequest} req - next level request value.
       * @returns {Promise<BoardResponse>} The asynchronous result.
       */
      nextLevel: async (ctx: restate.ObjectContext, req: NextLevelRequest) => {
        const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
        assertSession(session);
        assertRequestMatchesSession(session, req);
        assertActive(session, await ctx.date.now());

        const boards = (await ctx.get<InFlightBoard[]>(STATE_KEY_BOARDS)) ?? [];
        const board = currentBoard(boards, session.currentRound);
        assertBoard(board);

        const nextRound = session.currentRound + 1;
        if (nextRound > session.totalRounds) {
          throw generateTerminalError("END_OF_SEQUENCE", 422);
        }

        // Idempotent: board may already be pre-fetched
        const existing = boards.find(
          (board) => board.roundNumber === nextRound,
        );
        if (existing) {
          return gameService.formatBoardResponseFromState(existing);
        }

        const levelId = gameService.getLevelForRound(
          nextRound,
          session.levelConfigs,
        );
        const nextInFlightBoard = await ctx.run("pick-next-board", async () =>
          gameService.buildInFlightBoard(
            await gameService.pickBoardWithData(levelId, session.usedBoardIds),
            nextRound,
            false,
          ),
        );

        ctx.set(STATE_KEY_SESSION, {
          ...session,
          usedBoardIds: [...session.usedBoardIds, nextInFlightBoard.boardId],
        });
        ctx.set(STATE_KEY_BOARDS, [...boards, nextInFlightBoard]);

        return gameService.formatBoardResponseFromState(nextInFlightBoard);
      },

      // ── submitMoves ───────────────────────────────────────────────────

      /**
       * Submit a batch of block placement/removal moves for the current active board.
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

        const boards = (await ctx.get<InFlightBoard[]>(STATE_KEY_BOARDS)) ?? [];
        const board = currentBoard(boards, session.currentRound);
        assertBoard(board);

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
        const existingIds = new Set(
          board.moves.map((move) => move.clientMoveId),
        );
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
            row: move.row,
            col: move.col,
            blockId: move.blockId ?? null,
            blockType: move.blockType, // already a number from DTO transform
            action: (move.blockType !== null ? "place" : "remove") as
              | "place"
              | "remove",
            placedAt: new Date(move.placedAt),
            clientMoveId: move.moveId,
          }))
          .sort(
            (prev, next) => prev.placedAt.getTime() - next.placedAt.getTime(),
          )
          .filter((move) => move.placedAt <= new Date(session.expiryAtMs));

        if (sortedMoves.length === 0) {
          return earlyReturn;
        }

        const lastMoveAtDate = session.lastMoveAt
          ? new Date(session.lastMoveAt)
          : null;
        const freshMoves = lastMoveAtDate
          ? sortedMoves.filter((move) => move.placedAt >= lastMoveAtDate)
          : sortedMoves;
        const staleMoveCount = sortedMoves.length - freshMoves.length;

        if (staleMoveCount > 0) {
          ctx.console.warn("submitMoves: discarding stale moves from batch", {
            sessionId: session.sessionId,
            userId: session.userId,
            stageId: session.stageId,
            currentRound: session.currentRound,
            lastMoveAt: session.lastMoveAt,
            staleMoveCount,
            freshMoveCount: freshMoves.length,
            serverNow: now.toISOString(),
          });
        }

        if (freshMoves.length === 0) {
          return earlyReturn;
        }

        const maxPlacedAt = freshMoves[freshMoves.length - 1].placedAt;
        const futureSkewMs = maxPlacedAt.getTime() - nowMs;
        if (futureSkewMs > GAME_CONFIGS.MOVE_TIMESTAMP_FUTURE_SKEW_MS) {
          ctx.console.warn(
            "submitMoves OUT_OF_SEQUENCE: future move timestamp",
            {
              sessionId: session.sessionId,
              userId: session.userId,
              stageId: session.stageId,
              currentRound: session.currentRound,
              lastMoveAt: session.lastMoveAt,
              maxPlacedAt: maxPlacedAt.toISOString(),
              serverNow: now.toISOString(),
              futureByMs: futureSkewMs,
              allowedFutureSkewMs: GAME_CONFIGS.MOVE_TIMESTAMP_FUTURE_SKEW_MS,
            },
          );
          throw generateTerminalError("MOVE_TIMESTAMP_IN_FUTURE", 422);
        }

        // Deep-clone blocks to avoid mutating Restate state
        const blocksCopy = board.blocks.map((b) => ({ ...b }));

        // Replay moves against copied state
        const results = gameService.replayMovesAgainstState(freshMoves, {
          ...board,
          blocks: blocksCopy,
        });

        // Build new move records
        const newMoveRecords: InFlightMove[] = results.map((result, i) => ({
          id: crypto.randomUUID(),
          clientMoveId: freshMoves[i].clientMoveId,
          sessionBlockId: result.sessionBlockId ?? null,
          row: result.row,
          col: result.col,
          blockType: result.blockType,
          action: result.action,
          success: result.success,
          placedAt: result.placedAt.toISOString(),
        }));

        const lastMoveId = newMoveRecords[newMoveRecords.length - 1].id;

        const updatedBoard: InFlightBoard = {
          ...board,
          blocks: blocksCopy,
          moves: [...board.moves, ...newMoveRecords],
        };

        // Verify board solve state after every move batch using frontend-mirror algorithm
        const verifyResult = verifyRound(
          updatedBoard.initialBlocks ?? [],
          updatedBoard.cells,
          updatedBoard.moves,
          updatedBoard.gridY,
          updatedBoard.gridX,
        );
        ctx.console.log(
          `[submitMoves] board validation after ${newMoveRecords.length} move(s)`,
          {
            sessionId: session.sessionId,
            userId: session.userId,
            round: session.currentRound,
            totalMovesOnBoard: updatedBoard.moves.length,
            batchAccepted: newMoveRecords.filter((m) => m.success).length,
            batchRejected: newMoveRecords.filter((m) => !m.success).length,
            placedBlocks: verifyResult.placedBlockCount,
            litTargets: verifyResult.litTargets,
            totalTargets: verifyResult.totalTargets,
            isSolved: verifyResult.solved,
            board: verifyResult.board,
          },
        );

        ctx.set(
          STATE_KEY_BOARDS,
          boards.map((board) =>
            board.roundNumber === session.currentRound ? updatedBoard : board,
          ),
        );
        ctx.set(STATE_KEY_SESSION, {
          ...session,
          lastMoveAt: maxPlacedAt.toISOString(),
          lastMoveId,
        });

        return {
          accepted: results.length,
          startedAt: session.startedAt,
          expiryAt: new Date(session.expiryAtMs).toISOString(),
        };
      },

      // ── endBoard ──────────────────────────────────────────────────────

      /**
       * End the current board using server-side laser simulation to determine score.
       *
       * @param {restate.ObjectContext} ctx - Restate object context.
       * @param {EndBoardRequest} req - end board request value.
       * @returns {Promise<{ gameOver: boolean; roundScore: number }>} The asynchronous result.
       */
      endBoard: async (ctx: restate.ObjectContext, req: EndBoardRequest) => {
        const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
        assertSession(session);
        assertRequestMatchesSession(session, req);
        const nowMs = await ctx.date.now();
        assertActive(session, nowMs, true);

        const boards = (await ctx.get<InFlightBoard[]>(STATE_KEY_BOARDS)) ?? [];
        const board = currentBoard(boards, session.currentRound);
        assertBoard(board);

        const now = new Date(nowMs);
        const isExpiredCall =
          session.status === GAME_SESSION_STATUS.RESULT_PROCESSING;

        // Log initial board state before validation
        ctx.console.log("[endBoard] INITIAL BOARD STATE", {
          sessionId: session.sessionId,
          userId: session.userId,
          round: session.currentRound,
          boardId: board.boardId,
          gridSize: `${board.gridY}x${board.gridX}`,
          totalCells: board.cells.length,
          initialBlockCount: (board.initialBlocks ?? []).length,
          initialBlocks: (board.initialBlocks ?? []).map((b) => ({
            id: b.id,
            row: b.row,
            col: b.col,
            blockType: b.blockType,
            isFixed: b.isFixed,
          })),
          totalMoves: board.moves.length,
          successfulMoves: board.moves.filter((m) => m.success).length,
        });

        // Log all moves submitted for this board
        ctx.console.log("[endBoard] ALL MOVES ON BOARD", {
          sessionId: session.sessionId,
          userId: session.userId,
          round: session.currentRound,
          moves: board.moves.map((m, i) => ({
            index: i + 1,
            clientMoveId: m.clientMoveId,
            sessionBlockId: m.sessionBlockId,
            action: m.action,
            row: m.row,
            col: m.col,
            blockType: m.blockType,
            success: m.success,
            placedAt: m.placedAt,
          })),
        });

        // Validate board using verifyLogicReflectorRoundCompleted (via verifyRound adapter)
        const verifyResult = verifyRound(
          board.initialBlocks ?? [],
          board.cells,
          board.moves,
          board.gridY,
          board.gridX,
        );

        // Log final board state after move replay and laser simulation
        ctx.console.log("[endBoard] FINAL BOARD STATE AFTER VALIDATION", {
          sessionId: session.sessionId,
          userId: session.userId,
          round: session.currentRound,
          boardId: board.boardId,
          placedBlockCount: verifyResult.placedBlockCount,
          litTargets: verifyResult.litTargets,
          totalTargets: verifyResult.totalTargets,
          isSolved: verifyResult.solved,
          board: verifyResult.board,
        });

        const roundScore = verifyResult.solved ? 1000 : 0;
        const isActualLastRound = session.currentRound >= session.totalRounds;

        const closedBoard: InFlightBoard = {
          ...board,
          endedAt: now.toISOString(),
          score: roundScore,
        };
        const updatedBoards = boards.map((board) =>
          board.roundNumber === session.currentRound ? closedBoard : board,
        );

        if (isExpiredCall) {
          if (isActualLastRound) {
            ctx.set(STATE_KEY_BOARDS, updatedBoards);
            await ctx.run("finalize-on-expire", () =>
              gameService.finalizeAndCommit(
                session,
                updatedBoards,
                now,
                roundScore === 1000
                  ? GAME_SESSION_STATUS.ENDED
                  : GAME_SESSION_STATUS.EXPIRED,
              ),
            );
            ctx.clearAll();
            return { gameOver: true, roundScore };
          }
          const nextRound = session.currentRound + 1;
          let resultProcessingBoards = updatedBoards;
          let updatedSession = { ...session, currentRound: nextRound };
          const prefetched = boards.find(
            (board) => board.roundNumber === nextRound,
          );
          if (!prefetched && nextRound <= session.totalRounds) {
            const levelId = gameService.getLevelForRound(
              nextRound,
              session.levelConfigs,
            );
            const nextInFlightBoard = await ctx.run(
              "pick-board-on-expired-end",
              async () =>
                gameService.buildInFlightBoard(
                  await gameService.pickBoardWithData(
                    levelId,
                    session.usedBoardIds,
                  ),
                  nextRound,
                  true,
                ),
            );
            resultProcessingBoards = [...updatedBoards, nextInFlightBoard];
            updatedSession = {
              ...updatedSession,
              usedBoardIds: [
                ...session.usedBoardIds,
                nextInFlightBoard.boardId,
              ],
            };
          }
          ctx.set(STATE_KEY_BOARDS, resultProcessingBoards);
          ctx.set(STATE_KEY_SESSION, updatedSession);
          return { gameOver: false, roundScore };
        }

        // Normal STARTED path — last round
        if (isActualLastRound) {
          ctx.set(STATE_KEY_BOARDS, updatedBoards);
          await ctx.run("finalize-last-round", () =>
            gameService.finalizeAndCommit(
              session,
              updatedBoards,
              now,
              GAME_SESSION_STATUS.ENDED,
            ),
          );
          ctx.clearAll();
          return { gameOver: true, roundScore };
        }

        // Advance round; next board may already be pre-fetched by nextLevel
        const nextRound = session.currentRound + 1;
        let updatedSession = { ...session, currentRound: nextRound };

        const prefetched = boards.find(
          (board) => board.roundNumber === nextRound,
        );
        if (!prefetched) {
          const levelId = gameService.getLevelForRound(
            nextRound,
            session.levelConfigs,
          );
          const nextInFlightBoard = await ctx.run(
            "pick-board-on-end",
            async () =>
              gameService.buildInFlightBoard(
                await gameService.pickBoardWithData(
                  levelId,
                  session.usedBoardIds,
                ),
                nextRound,
                true,
              ),
          );
          updatedSession = {
            ...updatedSession,
            usedBoardIds: [...session.usedBoardIds, nextInFlightBoard.boardId],
          };
          ctx.set(STATE_KEY_BOARDS, [...updatedBoards, nextInFlightBoard]);
        } else {
          ctx.set(STATE_KEY_BOARDS, updatedBoards);
        }

        ctx.set(STATE_KEY_SESSION, updatedSession);
        return { gameOver: false, roundScore };
      },

      // ── endGame ───────────────────────────────────────────────────────

      /**
       * Finalize the game from the current in-flight state.
       *
       * @param {restate.ObjectContext} ctx - Restate object context.
       * @param {EndGameRequest} req - end game request value.
       * @returns {Promise<{ status: number; totalScore: number; timeBonus: number }>} The asynchronous result.
       */
      endGame: async (ctx: restate.ObjectContext, req: EndGameRequest) => {
        const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
        assertSession(session);
        assertRequestMatchesSession(session, req);
        const nowMs = await ctx.date.now();
        assertActive(session, nowMs, true);

        const boards = (await ctx.get<InFlightBoard[]>(STATE_KEY_BOARDS)) ?? [];
        const now = new Date(nowMs);
        const hintStatus =
          nowMs >= session.expiryAtMs
            ? GAME_SESSION_STATUS.EXPIRED
            : isGameCompleted(session, boards)
              ? GAME_SESSION_STATUS.ENDED
              : GAME_SESSION_STATUS.MANUALLY_ENDED;

        // Validate every board using verifyLogicReflectorRoundCompleted before finalizing
        for (const board of boards) {
          ctx.console.log("[endGame] INITIAL BOARD STATE", {
            sessionId: session.sessionId,
            userId: session.userId,
            round: board.roundNumber,
            boardId: board.boardId,
            gridSize: `${board.gridY}x${board.gridX}`,
            totalCells: board.cells.length,
            initialBlockCount: (board.initialBlocks ?? []).length,
            initialBlocks: (board.initialBlocks ?? []).map((b) => ({
              id: b.id,
              row: b.row,
              col: b.col,
              blockType: b.blockType,
              isFixed: b.isFixed,
            })),
            totalMoves: board.moves.length,
            successfulMoves: board.moves.filter((m) => m.success).length,
          });

          ctx.console.log("[endGame] ALL MOVES ON BOARD", {
            sessionId: session.sessionId,
            userId: session.userId,
            round: board.roundNumber,
            moves: board.moves.map((m, i) => ({
              index: i + 1,
              clientMoveId: m.clientMoveId,
              sessionBlockId: m.sessionBlockId,
              action: m.action,
              row: m.row,
              col: m.col,
              blockType: m.blockType,
              success: m.success,
              placedAt: m.placedAt,
            })),
          });

          const verifyResult = verifyRound(
            board.initialBlocks ?? [],
            board.cells,
            board.moves,
            board.gridY,
            board.gridX,
          );

          ctx.console.log("[endGame] FINAL BOARD STATE AFTER VALIDATION", {
            sessionId: session.sessionId,
            userId: session.userId,
            round: board.roundNumber,
            boardId: board.boardId,
            placedBlockCount: verifyResult.placedBlockCount,
            litTargets: verifyResult.litTargets,
            totalTargets: verifyResult.totalTargets,
            isSolved: verifyResult.solved,
            board: verifyResult.board,
          });
        }

        await ctx.run("finalize-end-game", () =>
          gameService.finalizeAndCommit(session, boards, now, hintStatus),
        );
        ctx.clearAll();
        return gameService.buildFinalizeResult(
          session,
          boards,
          now,
          hintStatus,
        );
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
          const boards =
            (await ctx.get<InFlightBoard[]>(STATE_KEY_BOARDS)) ?? [];
          return gameService.buildGameResponseFromState(session, boards);
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
            `markResultProcessing: state already cleared for session ${req.sessionId} — game was finalized before expiry timer fired`,
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
              `finalizeExpired: state already cleared for session ${req.sessionId} — game was finalized before expiry timer fired`,
            );
          }
          return;
        }

        const boards = (await ctx.get<InFlightBoard[]>(STATE_KEY_BOARDS)) ?? [];
        const now = new Date(await ctx.date.now());

        await ctx.run("finalize-expired", () =>
          gameService.finalizeAndCommit(
            session,
            boards,
            now,
            GAME_SESSION_STATUS.EXPIRED,
          ),
        );
        ctx.clearAll();
      },
    }),
  });
}

export type GameSessionRestateObject = ReturnType<
  typeof createGameSessionRestateObject
>;

export const GAME_SESSION_RESTATE_TARGET = {
  name: RESTATE_SERVICES.GAME_SESSION,
} as GameSessionRestateObject;
