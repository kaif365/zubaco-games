import {
    GAME_CONFIGS,
    GAME_SESSION_STATUS,
    MOVE_STATUS,
    RESTATE_SERVICES,
    TERMINAL_GAME_SESSION_STATUSES,
} from '@common/constants';
import * as restate from '@restatedev/restate-sdk';

import type { InFlightInput, InFlightSession } from './game-restate-state.types';
import { STATE_KEY_INPUTS, STATE_KEY_SESSION } from './game-restate-state.types';
import type { GameService } from './game.service';
import { throwTerminalError } from './restate-errors';

// ── Request shapes ─────────────────────────────────────────────────────────────

export interface StartGameRequest {
    userId: string;
    stageId: string;
}

export interface ValidateMoveRequest {
    userId: string;
    stageId: string;
    tileId: number;
}

export interface ValidateRoundRequest {
    userId: string;
    stageId: string;
    playerSequence: number[];
}

export interface PrevSequenceRequest {
    userId: string;
    stageId: string;
    currentActualRound: number;
}

export interface NextSequenceRequest {
    userId: string;
    stageId: string;
    requestedActualRound: number;
}

export interface EndGameRequest {
    userId: string;
    stageId: string;
    reason: 'COMPLETED' | 'TIME_UP' | 'WRONG_MOVE';
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function assertSession(session: InFlightSession | null): asserts session is InFlightSession {
    if (!session) {
        throwTerminalError('GAME_SESSION_NOT_FOUND', 404);
    }
}

function warnIfTimestampFuture(
    ctx: restate.ObjectContext,
    session: InFlightSession,
    nowMs: number,
): void {
    if (nowMs > session.expiryAtMs + GAME_CONFIGS.MOVE_TIMESTAMP_FUTURE_SKEW_MS) {
        ctx.console.warn(
            `MOVE_TIMESTAMP_IN_FUTURE: sessionId=${session.sessionId} userId=${session.userId} ` +
                `stageId=${session.stageId} serverNow=${new Date(nowMs).toISOString()} ` +
                `expiryAtMs=${session.expiryAtMs} futureByMs=${nowMs - session.expiryAtMs} ` +
                `allowedSkewMs=${GAME_CONFIGS.MOVE_TIMESTAMP_FUTURE_SKEW_MS}`,
        );
    }
}

function assertSequenceOrder(
    ctx: restate.ObjectContext,
    session: InFlightSession,
    nowMs: number,
): void {
    if (session.lastMoveAt !== null) {
        const lastMs = new Date(session.lastMoveAt).getTime();
        if (nowMs < lastMs) {
            ctx.console.warn(
                `OUT_OF_SEQUENCE: sessionId=${session.sessionId} userId=${session.userId} ` +
                    `stageId=${session.stageId} serverNow=${new Date(nowMs).toISOString()} ` +
                    `lastMoveAt=${session.lastMoveAt} behindByMs=${lastMs - nowMs}`,
            );
            throwTerminalError('OUT_OF_SEQUENCE', 409, {
                sessionId: session.sessionId,
                lastMoveAt: session.lastMoveAt,
                serverNow: new Date(nowMs).toISOString(),
            });
        }
    }
}

function assertActive(session: InFlightSession, allowResultProcessing = false): void {
    const allowed = allowResultProcessing
        ? [GAME_SESSION_STATUS.ACTIVE, GAME_SESSION_STATUS.RESULT_PROCESSING]
        : [GAME_SESSION_STATUS.ACTIVE];
    if (!(allowed as number[]).includes(session.status)) {
        throwTerminalError('GAME_SESSION_NOT_ACTIVE', 409);
    }
}

function totalActualRounds(session: InFlightSession): number {
    return session.config.maxSequence - session.config.minSequence + 1;
}

function currentSequenceLength(session: InFlightSession): number {
    return session.config.minSequence + session.completedRounds;
}

function isGameCompleted(session: InFlightSession): boolean {
    return session.completedRounds >= totalActualRounds(session);
}

type MoveResult = Record<string, unknown>;

type MoveProcessingState = {
    session: InFlightSession;
    inputs: InFlightInput[];
    nowMs: number;
};

function buildMoveProcessingState(
    session: InFlightSession,
    inputs: InFlightInput[],
    nowMs: number,
): MoveProcessingState {
    return { session, inputs, nowMs };
}

function processMove(
    gameService: GameService,
    state: MoveProcessingState,
    tileId: number,
): { nextState: MoveProcessingState; result: MoveResult; shouldFinalize: boolean } {
    const { session, inputs, nowMs } = state;

    if (nowMs >= session.expiryAtMs) {
        return {
            nextState: state,
            result: { status: MOVE_STATUS.TIME_UP },
            shouldFinalize: false,
        };
    }

    const seqLength = currentSequenceLength(session);
    const expectedTile = session.cachedSequence
        ? session.cachedSequence[session.roundProgress]
        : gameService.generateSequence(session.serverSeed, seqLength, session.config.cellCount)[
              session.roundProgress
          ];
    const isCorrect = tileId === expectedTile;
    const inputTime = new Date(nowMs).toISOString();

    const newInput: InFlightInput = {
        id: crypto.randomUUID(),
        tileId,
        isCorrect,
        isDemo: false,
        serverTime: inputTime,
        roundIndex: session.completedRounds,
    };

    const nextInputs = [...inputs, newInput];
    const actual = totalActualRounds(session);

    if (!isCorrect) {
        const newCompletedRounds = session.completedRounds + 1;
        const gameEnded = newCompletedRounds >= actual;
        const newSession: InFlightSession = {
            ...session,
            completedRounds: newCompletedRounds,
            roundProgress: 0,
            hasAnyPreviousWrong: true,
            lastMoveAt: inputTime,
            currentRound: newCompletedRounds + 1,
            currentActualRound: newCompletedRounds + 1,
        };

        if (gameEnded) {
            const finalScore = gameService.calculateFinalScore(
                session.successfulMoves,
                session.config.scorePerClick,
                0,
            );

            return {
                nextState: buildMoveProcessingState(newSession, nextInputs, nowMs),
                shouldFinalize: true,
                result: {
                    status: MOVE_STATUS.GAME_COMPLETE,
                    finalScore,
                    bonus: 0,
                    completedRounds: newCompletedRounds,
                    currentScore: finalScore,
                },
            };
        }

        const nextSeqLength = session.config.minSequence + newCompletedRounds;
        const nextSequence = newSession.cachedSequence
            ? newSession.cachedSequence.slice(0, nextSeqLength)
            : gameService.generateSequence(
                  newSession.serverSeed,
                  nextSeqLength,
                  newSession.config.cellCount,
              );

        return {
            nextState: buildMoveProcessingState(newSession, nextInputs, nowMs),
            shouldFinalize: false,
            result: {
                status: MOVE_STATUS.WRONG_MOVE,
                sequence: nextSequence,
                nextRound: newCompletedRounds + 1,
                completedRounds: newCompletedRounds,
                flashDelay: session.config.flashDelay,
                levelDelay: session.config.levelDelay,
                currentScore: gameService.calculateFinalScore(
                    session.successfulMoves,
                    session.config.scorePerClick,
                    0,
                ),
            },
        };
    }

    const newProgress = session.roundProgress + 1;

    if (newProgress >= seqLength) {
        const newSuccessfulMoves = session.successfulMoves + seqLength;
        const newCompletedRounds = session.completedRounds + 1;
        const newSuccessfulRounds = (session.successfulRounds ?? 0) + 1;
        const gameEnded = newCompletedRounds >= actual;
        const newSession: InFlightSession = {
            ...session,
            completedRounds: newCompletedRounds,
            successfulRounds: newSuccessfulRounds,
            roundProgress: 0,
            successfulMoves: newSuccessfulMoves,
            lastMoveAt: inputTime,
            currentRound: newCompletedRounds + 1,
            currentActualRound: newCompletedRounds + 1,
        };

        if (gameEnded) {
            const secondsLeft = Math.max(0, (session.expiryAtMs - nowMs) / 1_000);
            const bonusEligible = gameService.isBonusEligible(
                newSession.hasAnyPreviousWrong,
                session.config.wrongMoveHandling,
            );
            const timeBonus = bonusEligible
                ? Math.floor(secondsLeft * session.config.bonusTimeRatio)
                : 0;
            const finalScore = gameService.calculateFinalScore(
                newSuccessfulMoves,
                session.config.scorePerClick,
                timeBonus,
            );

            return {
                nextState: buildMoveProcessingState(newSession, nextInputs, nowMs),
                shouldFinalize: true,
                result: {
                    status: MOVE_STATUS.GAME_COMPLETE,
                    bonus: timeBonus,
                    finalScore,
                    completedRounds: newCompletedRounds,
                    currentScore: finalScore - timeBonus,
                },
            };
        }

        const nextSeqLength = session.config.minSequence + newCompletedRounds;
        const nextSequence = newSession.cachedSequence
            ? newSession.cachedSequence.slice(0, nextSeqLength)
            : gameService.generateSequence(
                  newSession.serverSeed,
                  nextSeqLength,
                  newSession.config.cellCount,
              );

        return {
            nextState: buildMoveProcessingState(newSession, nextInputs, nowMs),
            shouldFinalize: false,
            result: {
                status: MOVE_STATUS.ROUND_SUCCESS,
                sequence: nextSequence,
                nextRound: newCompletedRounds + 1,
                completedRounds: newCompletedRounds,
                flashDelay: session.config.flashDelay,
                levelDelay: session.config.levelDelay,
                currentScore: gameService.calculateFinalScore(
                    newSuccessfulMoves,
                    session.config.scorePerClick,
                    0,
                ),
            },
        };
    }

    const newSession: InFlightSession = {
        ...session,
        roundProgress: newProgress,
        lastMoveAt: inputTime,
    };

    return {
        nextState: buildMoveProcessingState(newSession, nextInputs, nowMs),
        shouldFinalize: false,
        result: {
            status: MOVE_STATUS.SUCCESS,
            currentScore: gameService.calculateFinalScore(
                session.successfulMoves,
                session.config.scorePerClick,
                0,
            ),
        },
    };
}

// ── Factory ────────────────────────────────────────────────────────────────────

export function createGameSessionRestateObject(gameService: GameService) {
    async function finalize(
        ctx: restate.ObjectContext,
        state: MoveProcessingState,
        result: MoveResult,
        nowMs: number,
        contextKey: string,
    ): Promise<void> {
        const finalStatus =
            state.session.completedRounds >= totalActualRounds(state.session)
                ? GAME_SESSION_STATUS.COMPLETED
                : GAME_SESSION_STATUS.MANUALLY_ENDED;
        await ctx.run(contextKey, () =>
            gameService.finalizeAndCommit(
                state.session,
                state.inputs,
                new Date(nowMs),
                finalStatus,
                (result['bonus'] as number | undefined) ?? 0,
                (result['finalScore'] as number | undefined) ?? 0,
            ),
        );
        ctx.clearAll();
    }

    return restate.object({
        name: RESTATE_SERVICES.GAME_SESSION,
        handlers: {
            // ── startGame ──────────────────────────────────────────────────────

            startGame: async (ctx: restate.ObjectContext, req: StartGameRequest) => {
                // Re-entry: active game already in Restate state — fetch both in parallel
                const [existingSession, rawInputs] = await Promise.all([
                    ctx.get<InFlightSession>(STATE_KEY_SESSION),
                    ctx.get<InFlightInput[]>(STATE_KEY_INPUTS),
                ]);
                if (existingSession) {
                    return gameService.buildStartGameResponse(existingSession, rawInputs ?? []);
                }

                // Single DB query — branch on status to detect completed vs. orphaned open session
                const existingDbSession = await ctx.run('check-existing-session', () =>
                    gameService.fetchAnySession(req.userId, req.stageId),
                );
                if (existingDbSession) {
                    if (
                        (TERMINAL_GAME_SESSION_STATUSES as readonly number[]).includes(
                            existingDbSession.status,
                        )
                    ) {
                        throwTerminalError('STAGE_ALREADY_COMPLETED', 409);
                    }
                    throwTerminalError('GAME_SESSION_RECOVERY_REQUIRED', 409, {
                        sessionId: existingDbSession.id,
                    });
                }

                // Fetch game config
                const stageConfig = await ctx.run('fetch-stage-config', () =>
                    gameService.fetchStageConfig(req.stageId),
                );

                // Create DB session + snapshot
                const { sessionId, serverSeed, startedAtMs } = await ctx.run('create-session', () =>
                    gameService.createGameSession(req.userId, req.stageId, stageConfig),
                );

                const expiryAtMs = startedAtMs + stageConfig.timeLimit * 1_000;

                // Pre-compute the full sequence once and cache it in Restate state
                const cachedSequence = gameService.generateSequence(
                    serverSeed,
                    stageConfig.maxSequence,
                    stageConfig.cellCount,
                );

                const sessionState: InFlightSession = {
                    sessionId,
                    userId: req.userId,
                    stageId: req.stageId,
                    status: GAME_SESSION_STATUS.ACTIVE,
                    serverSeed,
                    expiryAtMs,
                    startedAtMs,
                    config: {
                        timeLimit: stageConfig.timeLimit,
                        minSequence: stageConfig.minSequence,
                        maxSequence: stageConfig.maxSequence,
                        flashDelay: stageConfig.flashDelay,
                        levelDelay: stageConfig.levelDelay,
                        bonusTimeRatio: stageConfig.bonusTimeRatio,
                        scorePerClick: stageConfig.scorePerClick,
                        cellCount: stageConfig.cellCount,
                        wrongMoveHandling: stageConfig.wrongMoveHandling,
                    },
                    completedRounds: 0,
                    successfulRounds: 0,
                    roundProgress: 0,
                    successfulMoves: 0,
                    currentRound: 1,
                    currentActualRound: 1,
                    actualRoundRequested: 1,
                    hasAnyPreviousWrong: false,
                    lastMoveAt: null,
                    cachedSequence,
                };

                ctx.set(STATE_KEY_SESSION, sessionState);
                ctx.set(STATE_KEY_INPUTS, []);

                await ctx.run('schedule-expiry', () =>
                    gameService.scheduleExpiry(sessionId, expiryAtMs, req.userId, req.stageId),
                );

                return gameService.buildStartGameResponse(sessionState, []);
            },

            // ── validateMove ───────────────────────────────────────────────────

            validateMove: async (ctx: restate.ObjectContext, req: ValidateMoveRequest) => {
                // Fetch all state and server time in parallel
                const [session, rawInputs, nowMs] = await Promise.all([
                    ctx.get<InFlightSession>(STATE_KEY_SESSION),
                    ctx.get<InFlightInput[]>(STATE_KEY_INPUTS),
                    ctx.date.now(),
                ]);
                assertSession(session);
                assertActive(session);
                warnIfTimestampFuture(ctx, session, nowMs);

                if (nowMs >= session.expiryAtMs) {
                    return { status: MOVE_STATUS.TIME_UP };
                }

                assertSequenceOrder(ctx, session, nowMs);

                const { nextState, result, shouldFinalize } = processMove(
                    gameService,
                    buildMoveProcessingState(session, rawInputs ?? [], nowMs),
                    req.tileId,
                );

                ctx.set(STATE_KEY_INPUTS, nextState.inputs);
                ctx.set(STATE_KEY_SESSION, nextState.session);

                if (shouldFinalize) {
                    await finalize(ctx, nextState, result, nowMs, 'finalize-single-move');
                }

                return result;
            },

            validateRound: async (ctx: restate.ObjectContext, req: ValidateRoundRequest) => {
                const [session, rawInputs, nowMs] = await Promise.all([
                    ctx.get<InFlightSession>(STATE_KEY_SESSION),
                    ctx.get<InFlightInput[]>(STATE_KEY_INPUTS),
                    ctx.date.now(),
                ]);
                assertSession(session);
                assertActive(session);
                warnIfTimestampFuture(ctx, session, nowMs);
                assertSequenceOrder(ctx, session, nowMs);

                let state = buildMoveProcessingState(session, rawInputs ?? [], nowMs);
                let lastResult: MoveResult = {
                    status: MOVE_STATUS.SUCCESS,
                    currentScore: gameService.calculateFinalScore(
                        session.successfulMoves,
                        session.config.scorePerClick,
                        0,
                    ),
                };
                let shouldFinalize = false;

                for (const tileId of req.playerSequence) {
                    const moveOutcome = processMove(gameService, state, tileId);
                    state = moveOutcome.nextState;
                    lastResult = moveOutcome.result;
                    shouldFinalize = moveOutcome.shouldFinalize;

                    const status = moveOutcome.result['status'] as string;
                    if (
                        status === MOVE_STATUS.WRONG_MOVE ||
                        status === MOVE_STATUS.TIME_UP ||
                        status === MOVE_STATUS.GAME_COMPLETE
                    ) {
                        break;
                    }
                }

                ctx.set(STATE_KEY_INPUTS, state.inputs);
                ctx.set(STATE_KEY_SESSION, state.session);

                if (shouldFinalize) {
                    await finalize(ctx, state, lastResult, nowMs, 'finalize-round');
                }

                return lastResult;
            },

            // ── prevSequence ───────────────────────────────────────────────────

            prevSequence: async (ctx: restate.ObjectContext, req: PrevSequenceRequest) => {
                const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
                assertSession(session);
                assertActive(session);

                const prevActual = Math.max(1, req.currentActualRound - 1);
                const prevSeqLength = session.config.minSequence + (prevActual - 1);
                return {
                    sequence: session.cachedSequence
                        ? session.cachedSequence.slice(0, prevSeqLength)
                        : gameService.generateSequence(session.serverSeed, prevSeqLength, session.config.cellCount),
                    isDemo: false,
                    currentActualRound: prevActual,
                    currentRound: prevActual,
                    gameSessionId: session.sessionId,
                };
            },

            // ── nextSequence ───────────────────────────────────────────────────

            nextSequence: async (ctx: restate.ObjectContext, req: NextSequenceRequest) => {
                const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
                assertSession(session);
                assertActive(session);

                const actual = totalActualRounds(session);
                const nextActual = req.requestedActualRound > 0 ? req.requestedActualRound + 1 : 1;
                if (nextActual > actual) {
                    throwTerminalError('NO_MORE_ACTUAL_ROUNDS', 409);
                }

                const newActualRequested = Math.max(session.actualRoundRequested, nextActual);
                const newSession: InFlightSession = {
                    ...session,
                    actualRoundRequested: newActualRequested,
                    currentActualRound: nextActual,
                    currentRound: nextActual,
                };
                ctx.set(STATE_KEY_SESSION, newSession);

                const nextSeqLength2 = session.config.minSequence + (nextActual - 1);
                return {
                    sequence: session.cachedSequence
                        ? session.cachedSequence.slice(0, nextSeqLength2)
                        : gameService.generateSequence(session.serverSeed, nextSeqLength2, session.config.cellCount),
                    isDemo: false,
                    currentActualRound: nextActual,
                    currentRound: nextActual,
                    status: MOVE_STATUS.ROUND_SUCCESS,
                    currentScore: 0,
                    gameSessionId: session.sessionId,
                    endTime: new Date(session.expiryAtMs),
                };
            },

            // ── endGame ────────────────────────────────────────────────────────

            endGame: async (ctx: restate.ObjectContext, req: EndGameRequest) => {
                const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);

                if (!session) {
                    const finalized = await ctx.run('check-already-finalized', () =>
                        gameService.fetchFinalizedSession(req.userId, req.stageId),
                    );
                    if (finalized) {
                        return {
                            finalScore: finalized.score ?? 0,
                            completedRounds: finalized.completedRounds,
                            successfulRounds: finalized.successfulRounds ?? 0,
                            bonus: 0,
                            reason: req.reason,
                        };
                    }
                    throwTerminalError('GAME_SESSION_NOT_FOUND', 404);
                }

                assertActive(session, true);

                const [rawInputs, nowMs] = await Promise.all([
                    ctx.get<InFlightInput[]>(STATE_KEY_INPUTS),
                    ctx.date.now(),
                ]);
                const inputs = rawInputs ?? [];

                let hintStatus: number;

                if (nowMs >= session.expiryAtMs) {
                    hintStatus = GAME_SESSION_STATUS.EXPIRED;
                } else if (isGameCompleted(session)) {
                    hintStatus = GAME_SESSION_STATUS.COMPLETED;
                } else {
                    hintStatus = GAME_SESSION_STATUS.MANUALLY_ENDED;
                }

                const secondsLeft = Math.max(0, (session.expiryAtMs - nowMs) / 1_000);
                const bonusEligible =
                    hintStatus === GAME_SESSION_STATUS.COMPLETED &&
                    gameService.isBonusEligible(
                        session.hasAnyPreviousWrong,
                        session.config.wrongMoveHandling,
                    );
                const timeBonus = bonusEligible
                    ? Math.floor(secondsLeft * session.config.bonusTimeRatio)
                    : 0;
                const finalScore = gameService.calculateFinalScore(
                    session.successfulMoves,
                    session.config.scorePerClick,
                    timeBonus,
                );

                await ctx.run('finalize-end-game', () =>
                    gameService.finalizeAndCommit(
                        session,
                        inputs,
                        new Date(nowMs),
                        hintStatus,
                        timeBonus,
                        finalScore,
                    ),
                );
                ctx.clearAll();

                return {
                    finalScore,
                    completedRounds: session.completedRounds,
                    successfulRounds: session.successfulRounds ?? 0,
                    bonus: timeBonus,
                    reason: req.reason,
                };
            },

            // ── getStatus ──────────────────────────────────────────────────────

            getStatus: async (ctx: restate.ObjectContext, req: GetStatusRequest) => {
                const [session, rawInputs] = await Promise.all([
                    ctx.get<InFlightSession>(STATE_KEY_SESSION),
                    ctx.get<InFlightInput[]>(STATE_KEY_INPUTS),
                ]);
                if (session) {
                    return gameService.buildStartGameResponse(session, rawInputs ?? []);
                }

                const dbSession = await ctx.run('fetch-status-from-db', () =>
                    gameService.fetchFinalizedSession(req.userId, req.stageId),
                );
                if (!dbSession) {
                    throwTerminalError('GAME_SESSION_NOT_FOUND', 404);
                }
                return gameService.buildResponseFromDb(dbSession);
            },

            // ── markResultProcessing ───────────────────────────────────────────

            markResultProcessing: async (
                ctx: restate.ObjectContext,
                req: MarkResultProcessingRequest,
            ) => {
                const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
                if (!session) {
                    ctx.console.warn(
                        `markResultProcessing: no state for session ${req.sessionId} — already finalized`,
                    );
                    return;
                }
                if (session.status !== GAME_SESSION_STATUS.ACTIVE) {
                    return;
                }
                ctx.set(STATE_KEY_SESSION, {
                    ...session,
                    status: GAME_SESSION_STATUS.RESULT_PROCESSING,
                });
            },

            // ── finalizeExpired ────────────────────────────────────────────────

            finalizeExpired: async (ctx: restate.ObjectContext, req: FinalizeExpiredRequest) => {
                const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);

                if (!session) {
                    const expired = await ctx.run('fallback-expire-db', () =>
                        gameService.expireOpenSessionWithoutRestateState(req.sessionId),
                    );
                    if (expired) {
                        ctx.console.warn(
                            `finalizeExpired: session ${req.sessionId} expired via DB fallback ` +
                                `(Restate state was already cleared)`,
                        );
                    } else {
                        ctx.console.warn(
                            `finalizeExpired: session ${req.sessionId} not found or already terminal — skipping`,
                        );
                    }
                    return;
                }

                const [rawInputs2, nowMs] = await Promise.all([
                    ctx.get<InFlightInput[]>(STATE_KEY_INPUTS),
                    ctx.date.now(),
                ]);
                const inputs = rawInputs2 ?? [];

                await ctx.run('finalize-expired', () =>
                    gameService.finalizeAndCommit(
                        session,
                        inputs,
                        new Date(nowMs),
                        GAME_SESSION_STATUS.EXPIRED,
                        0,
                        gameService.calculateFinalScore(
                            session.successfulMoves,
                            session.config.scorePerClick,
                            0,
                        ),
                    ),
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
