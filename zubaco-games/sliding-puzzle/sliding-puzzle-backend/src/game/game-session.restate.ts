import { GAME_CONFIGS, GAME_SESSION_STATUS, RESTATE_SERVICES } from '@common/constants';
import * as restate from '@restatedev/restate-sdk';

import type { SubmitMovesDto } from './dto/submit-moves.dto';
import type { InFlightBoard, InFlightMove, InFlightSession } from './game-restate-state.types';
import { STATE_KEY_BOARDS, STATE_KEY_SESSION } from './game-restate-state.types';
import type { GameService } from './game.service';
import { countCorrectPieces, isSolved } from './utils/shuffle.util';

// ── Request shapes ────────────────────────────────────────────────────────────

export interface StartGameRequest {
    userId: string;
    stageId: string;
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
 * Find the current board by round number.
 *
 * @param {InFlightBoard[]} boards - board state values.
 * @param {number} round - round number value.
 *
 * @returns {InFlightBoard | undefined} The current board, if present.
 */
function currentBoard(boards: InFlightBoard[], round: number): InFlightBoard | undefined {
    return boards.find((b) => b.roundNumber === round);
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
function assertSession(session: InFlightSession | null): asserts session is InFlightSession {
    if (!session) {
        throw generateTerminalError('GAME_SESSION_NOT_FOUND', 404, { clearData: true });
    }
}

/**
 * Assert that an active board exists.
 *
 * @param {InFlightBoard | undefined} board - board state value.
 */
function assertBoard(board: InFlightBoard | undefined): asserts board is InFlightBoard {
    if (!board) {
        throw generateTerminalError('NO_ACTIVE_BOARD', 404);
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
        throw generateTerminalError('GAME_SESSION_NOT_ACTIVE', 409);
    }
    const graceCutoff = session.expiryAtMs + GAME_CONFIGS.SUBMIT_MOVES_EXPIRY_GRACE_SECONDS * 1_000;
    if (nowMs > graceCutoff) {
        throw generateTerminalError('GAME_SESSION_NOT_ACTIVE', 409);
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
        throw generateTerminalError('GAME_SESSION_NOT_ACTIVE', 409);
    }
}

/**
 * Get the configured display time for a level.
 *
 * @param {string} levelId - level id value.
 * @param {InFlightSession['levelConfigs']} levelConfigs - level config values.
 *
 * @returns {number} The display time.
 */
function getDisplayTime(levelId: string, levelConfigs: InFlightSession['levelConfigs']): number {
    return levelConfigs.find((lc) => lc.levelId === levelId)?.displayTime ?? 0;
}

/**
 * Check whether all configured rounds were explicitly ended and solved.
 *
 * @param {InFlightSession} session - session state value.
 * @param {InFlightBoard[]} boards - board state values.
 *
 * @returns {boolean} Whether the game is fully completed.
 */
function isGameCompleted(session: InFlightSession, boards: InFlightBoard[]): boolean {
    if (boards.length < session.totalRounds) {
        return false;
    }
    const completedBoards = boards.filter((b) => b.roundNumber <= session.totalRounds);
    return completedBoards.every((b) => b.endedAt !== null && isSolved(b.pieces));
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
                const existingSession = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
                if (existingSession) {
                    const boards = (await ctx.get<InFlightBoard[]>(STATE_KEY_BOARDS)) ?? [];
                    return gameService.buildGameResponseFromState(existingSession, boards);
                }

                const finalizedResponse = await ctx.run('check-finalized-session', async () => {
                    const session = await gameService.fetchFinalizedSession(
                        req.userId,
                        req.stageId,
                    );
                    return session ? gameService.buildGameResponseFromDb(session) : null;
                });
                if (finalizedResponse) {
                    return finalizedResponse;
                }

                const existingOpenSession = await ctx.run('check-open-session', () =>
                    gameService.fetchOpenSession(req.userId, req.stageId),
                );
                if (existingOpenSession) {
                    throw generateTerminalError('GAME_SESSION_RECOVERY_REQUIRED', 409);
                }

                const stageConfig = await ctx.run('fetch-stage-config', () =>
                    gameService.fetchStageConfig(req.stageId),
                );

                const { sessionId, expiryAtMs, startedAtMs } = await ctx.run('create-session', () =>
                    gameService.createGameSession(req.userId, req.stageId, stageConfig),
                );

                const totalRounds = stageConfig.levels.reduce(
                    (sum: number, level: { boardCount: number }) => sum + level.boardCount,
                    0,
                );
                const levelConfigs = stageConfig.levels.map(
                    (level: {
                        levelId: string;
                        boardCount: number;
                        displayTime: number;
                        order: number;
                        maxScore: number;
                    }) => ({
                        levelId: level.levelId,
                        boardCount: level.boardCount,
                        displayTime: level.displayTime,
                        order: level.order,
                        maxScore: level.maxScore,
                    }),
                );

                const demoBoardIds = await ctx.run('fetch-demo-board-ids', () =>
                    gameService.fetchDemoBoardIds(req.userId, req.stageId),
                );

                const firstLevelId = stageConfig.levels[0].levelId;
                const firstInFlightBoard = await ctx.run('pick-first-board', async () =>
                    gameService.buildInFlightBoard(
                        await gameService.pickBoardWithPieces(firstLevelId, demoBoardIds),
                        1,
                        getDisplayTime(firstLevelId, levelConfigs),
                        stageConfig.enableNumbers,
                    ),
                );

                await ctx.run('schedule-expiry', () =>
                    gameService.scheduleExpiry(sessionId, expiryAtMs, req.userId, req.stageId),
                );

                const sessionState: InFlightSession = {
                    sessionId,
                    userId: req.userId,
                    stageId: req.stageId,
                    expiryAtMs,
                    timeLimitSeconds: stageConfig.timeLimit,
                    maxTimeBonus: stageConfig.maxTimeBonus,
                    enableNumbers: stageConfig.enableNumbers,
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

                return gameService.buildGameResponseFromState(sessionState, [firstInFlightBoard]);
            },

            // ── nextBoard ─────────────────────────────────────────────────────

            /**
             * Pre-create and return the next board once the current board is unlocked.
             *
             * @param {restate.ObjectContext} ctx - Restate object context.
             * @param {NextBoardRequest} req - next board request value.
             *
             * @returns {Promise<BoardResponse>} The asynchronous result.
             */
            nextBoard: async (ctx: restate.ObjectContext, req: NextBoardRequest) => {
                const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
                assertSession(session);
                assertRequestMatchesSession(session, req);
                assertActive(session, await ctx.date.now());

                const boards = (await ctx.get<InFlightBoard[]>(STATE_KEY_BOARDS)) ?? [];
                const board = currentBoard(boards, session.currentRound);
                assertBoard(board);

                const nextRound = session.currentRound + 1;
                if (nextRound > session.totalRounds) {
                    throw generateTerminalError('END_OF_SEQUENCE', 422);
                }

                // Idempotent: board may already be pre-fetched
                const existing = boards.find((b) => b.roundNumber === nextRound);
                if (existing) {
                    return gameService.formatBoardResponseFromState(existing);
                }

                const levelId = gameService.getLevelForRound(nextRound, session.levelConfigs);
                const nextInFlightBoard = await ctx.run('pick-next-board', async () =>
                    gameService.buildInFlightBoard(
                        await gameService.pickBoardWithPieces(levelId, session.usedBoardIds),
                        nextRound,
                        getDisplayTime(levelId, session.levelConfigs),
                        session.enableNumbers,
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
             * Submit a batch of moves for the current active board.
             *
             * @param {restate.ObjectContext} ctx - Restate object context.
             * @param {SubmitMovesRequest} req - submit moves request value.
             *
             * @returns {Promise<{ accepted: number; startedAt: string; expiryAt: string }>} The asynchronous result.
             */
            submitMoves: async (ctx: restate.ObjectContext, req: SubmitMovesRequest) => {
                const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
                assertSession(session);
                assertRequestMatchesSession(session, req);
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
                const existingIds = new Set(board.moves.map((move) => move.clientMoveId));
                const newMoves = dedupedBatch.filter((move) => !existingIds.has(move.moveId));

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
                        slot: move.slot,
                        clickedAt: new Date(move.clickedAt),
                        clientMoveId: move.moveId,
                    }))
                    .sort((a, b) => a.clickedAt.getTime() - b.clickedAt.getTime())
                    .filter((move) => move.clickedAt <= new Date(session.expiryAtMs));

                if (sortedMoves.length === 0) {
                    return earlyReturn;
                }

                const lastMoveAtDate = session.lastMoveAt ? new Date(session.lastMoveAt) : null;
                const freshMoves = lastMoveAtDate
                    ? sortedMoves.filter((move) => move.clickedAt >= lastMoveAtDate)
                    : sortedMoves;
                const staleMoveCount = sortedMoves.length - freshMoves.length;

                if (staleMoveCount > 0) {
                    ctx.console.warn('submitMoves: discarding stale moves from batch', {
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

                const maxClickedAt = freshMoves[freshMoves.length - 1].clickedAt;
                const futureSkewMs = maxClickedAt.getTime() - nowMs;
                if (futureSkewMs > GAME_CONFIGS.MOVE_TIMESTAMP_FUTURE_SKEW_MS) {
                    ctx.console.warn('submitMoves OUT_OF_SEQUENCE: future move timestamp', {
                        sessionId: session.sessionId,
                        userId: session.userId,
                        currentRound: session.currentRound,
                        maxClickedAt: maxClickedAt.toISOString(),
                        serverNow: now.toISOString(),
                        futureByMs: futureSkewMs,
                    });
                    throw generateTerminalError('MOVE_TIMESTAMP_IN_FUTURE', 422);
                }

                // Replay moves against in-state pieces (mutates a copy)
                const piecesCopy = [...board.pieces];
                const results = gameService.replayMovesAgainstState(freshMoves, {
                    ...board,
                    pieces: piecesCopy,
                });

                const newMoveRecords: InFlightMove[] = results.map((result, i) => ({
                    id: crypto.randomUUID(),
                    clientMoveId: freshMoves[i].clientMoveId,
                    fromSlot: result.fromSlot,
                    toSlot: result.toSlot,
                    pieceIndex: result.pieceIndex,
                    success: result.success,
                    clickedAt: result.clickedAt.toISOString(),
                }));

                const updatedBoard: InFlightBoard = {
                    ...board,
                    pieces: piecesCopy, // replayMoves mutated this in-place
                    moves: [...board.moves, ...newMoveRecords],
                };
                const lastMoveId = newMoveRecords[newMoveRecords.length - 1].id;

                ctx.set(
                    STATE_KEY_BOARDS,
                    boards.map((b) => (b.roundNumber === session.currentRound ? updatedBoard : b)),
                );
                ctx.set(STATE_KEY_SESSION, {
                    ...session,
                    lastMoveAt: maxClickedAt.toISOString(),
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
             * End the current board and advance or finalize the game.
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

                const boards = (await ctx.get<InFlightBoard[]>(STATE_KEY_BOARDS)) ?? [];
                const board = currentBoard(boards, session.currentRound);
                assertBoard(board);

                const now = new Date(nowMs);
                const isExpiredCall = session.status === GAME_SESSION_STATUS.RESULT_PROCESSING;
                const totalPieces = board.pieces.length;
                const correctPieces = countCorrectPieces(board.pieces);
                const completed = isSolved(board.pieces);
                const maxScore =
                    session.levelConfigs.find((lc) => lc.levelId === board.levelId)?.maxScore ??
                    1000;
                const roundScore = gameService.calculateRoundScore(
                    completed,
                    correctPieces,
                    totalPieces,
                    maxScore,
                );
                const isActualLastRound = session.currentRound >= session.totalRounds;

                const closedBoard: InFlightBoard = {
                    ...board,
                    endedAt: now.toISOString(),
                    score: roundScore,
                };
                const updatedBoards = boards.map((b) =>
                    b.roundNumber === session.currentRound ? closedBoard : b,
                );

                if (isExpiredCall) {
                    if (isActualLastRound) {
                        ctx.set(STATE_KEY_BOARDS, updatedBoards);
                        await ctx.run('finalize-on-expire', () =>
                            gameService.finalizeAndCommit(
                                session,
                                updatedBoards,
                                now,
                                completed ? GAME_SESSION_STATUS.ENDED : GAME_SESSION_STATUS.EXPIRED,
                            ),
                        );
                        ctx.clearAll();
                        return { gameOver: true, roundScore };
                    }
                    const nextRound = session.currentRound + 1;
                    let resultProcessingBoards = updatedBoards;
                    let updatedSession = { ...session, currentRound: nextRound };
                    const prefetched = boards.find((b) => b.roundNumber === nextRound);
                    if (!prefetched && nextRound <= session.totalRounds) {
                        const levelId = gameService.getLevelForRound(
                            nextRound,
                            session.levelConfigs,
                        );
                        const nextInFlightBoard = await ctx.run(
                            'pick-board-on-expired-end',
                            async () =>
                                gameService.buildInFlightBoard(
                                    await gameService.pickBoardWithPieces(
                                        levelId,
                                        session.usedBoardIds,
                                    ),
                                    nextRound,
                                    getDisplayTime(levelId, session.levelConfigs),
                                    session.enableNumbers,
                                ),
                        );
                        resultProcessingBoards = [...updatedBoards, nextInFlightBoard];
                        updatedSession = {
                            ...updatedSession,
                            usedBoardIds: [...session.usedBoardIds, nextInFlightBoard.boardId],
                        };
                    }
                    ctx.set(STATE_KEY_BOARDS, resultProcessingBoards);
                    ctx.set(STATE_KEY_SESSION, updatedSession);
                    return { gameOver: false, roundScore };
                }

                // Normal STARTED path — last round
                if (isActualLastRound) {
                    ctx.set(STATE_KEY_BOARDS, updatedBoards);
                    await ctx.run('finalize-last-round', () =>
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

                const nextRound = session.currentRound + 1;
                let updatedSession = { ...session, currentRound: nextRound };

                const prefetched = boards.find((b) => b.roundNumber === nextRound);
                if (!prefetched) {
                    const levelId = gameService.getLevelForRound(nextRound, session.levelConfigs);
                    const nextInFlightBoard = await ctx.run('pick-board-on-end', async () =>
                        gameService.buildInFlightBoard(
                            await gameService.pickBoardWithPieces(levelId, session.usedBoardIds),
                            nextRound,
                            getDisplayTime(levelId, session.levelConfigs),
                            session.enableNumbers,
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
             *
             * @returns {Promise<{ status: number; totalScore: number; timeBonus: number }>} The asynchronous result.
             */
            endGame: async (ctx: restate.ObjectContext, req: EndGameRequest) => {
                const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
                assertSession(session);
                assertRequestMatchesSession(session, req);
                const nowMs = await ctx.date.now();
                assertActive(session, nowMs, true);

                const rawBoards = (await ctx.get<InFlightBoard[]>(STATE_KEY_BOARDS)) ?? [];
                const now = new Date(nowMs);
                const closeAt = session.lastMoveAt ?? now.toISOString();
                const boards = rawBoards.map((b) =>
                    b.endedAt !== null ? b : { ...b, endedAt: closeAt },
                );
                const completed = isGameCompleted(session, boards);
                const lastMoveMs = session.lastMoveAt
                    ? new Date(session.lastMoveAt).getTime()
                    : nowMs;
                const hintStatus =
                    completed && lastMoveMs <= session.expiryAtMs
                        ? GAME_SESSION_STATUS.ENDED
                        : completed
                          ? GAME_SESSION_STATUS.MANUALLY_ENDED
                          : nowMs >= session.expiryAtMs
                            ? GAME_SESSION_STATUS.EXPIRED
                            : GAME_SESSION_STATUS.MANUALLY_ENDED;

                await ctx.run('finalize-end-game', () =>
                    gameService.finalizeAndCommit(session, boards, now, hintStatus),
                );
                ctx.clearAll();
                return gameService.buildFinalizeResult(session, boards, now, hintStatus);
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
                    const boards = (await ctx.get<InFlightBoard[]>(STATE_KEY_BOARDS)) ?? [];
                    return gameService.buildGameResponseFromState(session, boards);
                }

                const dbResponse = await ctx.run('fetch-status-from-db', async () => {
                    const s = await gameService.fetchFinalizedSession(req.userId, req.stageId);
                    return s ? gameService.buildGameResponseFromDb(s) : null;
                });
                if (!dbResponse) {
                    throw generateTerminalError('GAME_SESSION_NOT_FOUND', 404, { clearData: true });
                }
                return dbResponse;
            },

            // ── markResultProcessing ──────────────────────────────────────────

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
            finalizeExpired: async (ctx: restate.ObjectContext, req: FinalizeExpiredRequest) => {
                const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
                if (!session) {
                    const settled = await ctx.run('finalize-missing-state', () =>
                        gameService.expireOpenSessionWithoutRestateState(req.sessionId),
                    );
                    if (!settled) {
                        ctx.console.warn(
                            `finalizeExpired: state already cleared for session ${req.sessionId} — game was finalized before expiry timer fired`,
                        );
                    }
                    return;
                }

                const rawBoards = (await ctx.get<InFlightBoard[]>(STATE_KEY_BOARDS)) ?? [];
                const now = new Date(await ctx.date.now());
                const closeAt = session.lastMoveAt ?? now.toISOString();
                const boards = rawBoards.map((b) =>
                    b.endedAt !== null ? b : { ...b, endedAt: closeAt },
                );
                const completed = isGameCompleted(session, boards);
                const lastMoveMs = session.lastMoveAt
                    ? new Date(session.lastMoveAt).getTime()
                    : now.getTime();
                const hintStatus =
                    completed && lastMoveMs <= session.expiryAtMs
                        ? GAME_SESSION_STATUS.ENDED
                        : GAME_SESSION_STATUS.EXPIRED;

                await ctx.run('finalize-expired', () =>
                    gameService.finalizeAndCommit(session, boards, now, hintStatus),
                );
                ctx.clearAll();
            },
        },
    });
}

export type GameSessionRestateObject = ReturnType<typeof createGameSessionRestateObject>;

export const GAME_SESSION_RESTATE_TARGET = {
    name: RESTATE_SERVICES.GAME_SESSION,
} as GameSessionRestateObject;
