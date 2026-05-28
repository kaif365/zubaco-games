import { GAME_SESSION_STATUS, RESTATE_SERVICES } from '@common/constants';
import { HttpException } from '@nestjs/common';
import * as restate from '@restatedev/restate-sdk';

import type { CompleteBoardDto } from './dto/complete-board.dto';
import type { NextBoardDto } from './dto/next-board.dto';
import type { SaveProgressDto } from './dto/save-progress.dto';
import type { InFlightBoardState, InFlightSessionState } from './game-restate-state.types';
import { STATE_KEY_BOARDS, STATE_KEY_SESSION } from './game-restate-state.types';
import type { GameService } from './game.service';

interface SessionIdentity {
    userId: string;
    stageId: string;
}

type StartSessionRequest = SessionIdentity;

interface SaveProgressRequest extends SessionIdentity {
    dto: SaveProgressDto;
}

interface NextBoardRequest extends SessionIdentity {
    dto: NextBoardDto;
}

interface CompleteBoardRequest extends SessionIdentity {
    dto: CompleteBoardDto;
}

interface EndGameRequest extends SessionIdentity {
    sessionId: string;
}

interface GetCurrentBoardRequest extends SessionIdentity {
    sessionId: string;
}

interface GetTimerStateRequest extends SessionIdentity {
    sessionId: string;
}

interface MarkResultProcessingRequest {
    sessionId: string;
}

interface FinalizeExpiredRequest {
    sessionId: string;
}

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

function assertSessionIdentity(state: InFlightSessionState, req: SessionIdentity): void {
    if (state.userId !== req.userId || state.stageId !== req.stageId) {
        throw generateTerminalError('GAME_SESSION_NOT_ACTIVE', 409);
    }
}

function assertRouteSession(state: InFlightSessionState, sessionId: string): void {
    if (state.sessionId !== sessionId) {
        throw generateTerminalError('GAME_SESSION_NOT_ACTIVE', 409);
    }
}

function assertSequencable(state: InFlightSessionState, allowResultProcessing = false): void {
    const allowed: number[] = allowResultProcessing
        ? [GAME_SESSION_STATUS.ACTIVE, GAME_SESSION_STATUS.RESULT_PROCESSING]
        : [GAME_SESSION_STATUS.ACTIVE];

    if (!allowed.includes(state.status)) {
        throw generateTerminalError('GAME_SESSION_NOT_ACTIVE', 409);
    }
}

function getBoardsOrThrow(boards: InFlightBoardState[] | null | undefined): InFlightBoardState[] {
    if (!boards) {
        throw generateTerminalError('GAME_SESSION_NOT_FOUND', 404);
    }

    return boards;
}

function rethrowAsTerminal(error: unknown): never {
    if (error instanceof restate.TerminalError) {
        throw error;
    }

    if (error instanceof HttpException) {
        const response = error.getResponse();
        const message =
            typeof response === 'object' && response !== null && 'message' in response
                ? (response as { message?: string | string[] }).message
                : error.message;
        const normalizedMessage = Array.isArray(message) ? message[0] : message;
        throw generateTerminalError(
            normalizedMessage || error.message || 'REQUEST_FAILED',
            error.getStatus(),
        );
    }

    throw error;
}

export function createGameSessionRestateObject(gameService: GameService) {
    return restate.object({
        name: RESTATE_SERVICES.GAME_SESSION,
        handlers: {
            startSession: async (ctx: restate.ObjectContext, req: StartSessionRequest) => {
                const existing = await ctx.get<InFlightSessionState>(STATE_KEY_SESSION);
                if (existing) {
                    assertSessionIdentity(existing, req);
                    const boards = getBoardsOrThrow(
                        await ctx.get<InFlightBoardState[]>(STATE_KEY_BOARDS),
                    );
                    return gameService.getCurrentBoardFromState(existing, boards);
                }

                const finalizedResponse = await ctx.run('check-finalized-session', async () => {
                    const session = await gameService.fetchFinalizedSession(
                        req.userId,
                        req.stageId,
                    );
                    return session
                        ? gameService.getCurrentBoard(session.sessionId, req.userId)
                        : null;
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

                const created = await ctx.run('create-session', () =>
                    gameService.createInFlightSession(req.userId, req.stageId),
                );

                ctx.set(STATE_KEY_SESSION, created.session);
                ctx.set(STATE_KEY_BOARDS, created.boards);

                if (created.session.gameEndedAtMs !== null) {
                    await ctx.run('schedule-expiry', () =>
                        gameService.scheduleExpiry(
                            created.session.sessionId,
                            created.session.gameEndedAtMs!,
                            req.userId,
                            req.stageId,
                        ),
                    );
                }

                return created.response;
            },

            saveProgress: async (ctx: restate.ObjectContext, req: SaveProgressRequest) => {
                const session = await ctx.get<InFlightSessionState>(STATE_KEY_SESSION);
                if (!session) {
                    throw generateTerminalError('GAME_SESSION_NOT_FOUND', 404);
                }
                const boards = getBoardsOrThrow(
                    await ctx.get<InFlightBoardState[]>(STATE_KEY_BOARDS),
                );
                assertSessionIdentity(session, req);
                assertRouteSession(session, req.dto.sessionId);
                assertSequencable(session, true);

                let response: Awaited<ReturnType<typeof gameService.saveProgressInState>>;
                try {
                    response = await gameService.saveProgressInState(session, boards, req.dto);
                } catch (error) {
                    rethrowAsTerminal(error);
                }

                ctx.set(STATE_KEY_SESSION, session);
                ctx.set(STATE_KEY_BOARDS, boards);
                return response;
            },

            nextBoard: async (ctx: restate.ObjectContext, req: NextBoardRequest) => {
                const session = await ctx.get<InFlightSessionState>(STATE_KEY_SESSION);
                if (!session) {
                    throw generateTerminalError('GAME_SESSION_NOT_FOUND', 404);
                }
                const boards = getBoardsOrThrow(
                    await ctx.get<InFlightBoardState[]>(STATE_KEY_BOARDS),
                );
                assertSessionIdentity(session, req);
                assertRouteSession(session, req.dto.sessionId);
                assertSequencable(session);

                let response: Awaited<ReturnType<typeof gameService.getNextBoardFromState>>;
                try {
                    response = gameService.getNextBoardFromState(session, boards, req.dto);
                } catch (error) {
                    rethrowAsTerminal(error);
                }

                ctx.set(STATE_KEY_SESSION, session);
                ctx.set(STATE_KEY_BOARDS, boards);
                return response;
            },

            completeBoard: async (ctx: restate.ObjectContext, req: CompleteBoardRequest) => {
                const session = await ctx.get<InFlightSessionState>(STATE_KEY_SESSION);
                if (!session) {
                    throw generateTerminalError('GAME_SESSION_NOT_FOUND', 404);
                }
                const boards = getBoardsOrThrow(
                    await ctx.get<InFlightBoardState[]>(STATE_KEY_BOARDS),
                );
                assertSessionIdentity(session, req);
                assertRouteSession(session, req.dto.sessionId);
                assertSequencable(session, true);

                let result: Awaited<ReturnType<typeof gameService.completeBoardInState>>;
                try {
                    result = gameService.completeBoardInState(session, boards, req.dto);
                } catch (error) {
                    rethrowAsTerminal(error);
                }

                if (result.expiryAtMs !== null && session.status === GAME_SESSION_STATUS.ACTIVE) {
                    await ctx.run('schedule-expiry-on-actual-start', () =>
                        gameService.scheduleExpiry(
                            session.sessionId,
                            result.expiryAtMs!,
                            req.userId,
                            req.stageId,
                        ),
                    );
                }

                if (session.status === GAME_SESSION_STATUS.COMPLETED) {
                    await ctx.run('finalize-completed', () =>
                        gameService.finalizeStateSession(
                            session,
                            boards,
                            GAME_SESSION_STATUS.COMPLETED,
                        ),
                    );
                    ctx.clearAll();
                } else {
                    ctx.set(STATE_KEY_SESSION, session);
                    ctx.set(STATE_KEY_BOARDS, boards);
                }

                return result.response;
            },

            endGame: async (ctx: restate.ObjectContext, req: EndGameRequest) => {
                const session = await ctx.get<InFlightSessionState>(STATE_KEY_SESSION);
                if (!session) {
                    return ctx.run('end-game-without-state', () =>
                        gameService.endGame(req.sessionId, req.userId),
                    );
                }
                const boards = getBoardsOrThrow(
                    await ctx.get<InFlightBoardState[]>(STATE_KEY_BOARDS),
                );
                assertSessionIdentity(session, req);
                assertRouteSession(session, req.sessionId);
                assertSequencable(session, true);

                let response: Awaited<ReturnType<typeof gameService.endGameInState>>;
                try {
                    response = gameService.endGameInState(session, boards);
                } catch (error) {
                    rethrowAsTerminal(error);
                }
                await ctx.run('finalize-manual-end', () =>
                    gameService.finalizeStateSession(
                        session,
                        boards,
                        GAME_SESSION_STATUS.MANUALLY_ENDED,
                    ),
                );
                ctx.clearAll();
                return response;
            },

            getCurrentBoard: async (ctx: restate.ObjectContext, req: GetCurrentBoardRequest) => {
                const session = await ctx.get<InFlightSessionState>(STATE_KEY_SESSION);
                if (!session) {
                    return ctx.run('get-current-board-db', () =>
                        gameService.getCurrentBoard(req.sessionId, req.userId),
                    );
                }

                const boards = getBoardsOrThrow(
                    await ctx.get<InFlightBoardState[]>(STATE_KEY_BOARDS),
                );
                assertSessionIdentity(session, req);
                assertRouteSession(session, req.sessionId);
                return gameService.getCurrentBoardFromState(session, boards);
            },

            getTimerState: async (ctx: restate.ObjectContext, req: GetTimerStateRequest) => {
                const session = await ctx.get<InFlightSessionState>(STATE_KEY_SESSION);
                if (!session) {
                    return ctx.run('get-timer-state-db', () =>
                        gameService.getOwnedSessionTimer(req.sessionId, req.userId),
                    );
                }

                assertSessionIdentity(session, req);
                assertRouteSession(session, req.sessionId);
                return gameService.getTimerStateFromState(session);
            },

            markResultProcessing: async (
                ctx: restate.ObjectContext,
                req: MarkResultProcessingRequest,
            ) => {
                const session = await ctx.get<InFlightSessionState>(STATE_KEY_SESSION);
                if (!session || session.sessionId !== req.sessionId) {
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

            finalizeExpired: async (ctx: restate.ObjectContext, req: FinalizeExpiredRequest) => {
                const session = await ctx.get<InFlightSessionState>(STATE_KEY_SESSION);
                if (!session) {
                    await ctx.run('finalize-missing-state', () =>
                        gameService.expireOpenSessionWithoutRestateState(req.sessionId),
                    );
                    return;
                }

                if (session.sessionId !== req.sessionId) {
                    return;
                }

                const boards = getBoardsOrThrow(
                    await ctx.get<InFlightBoardState[]>(STATE_KEY_BOARDS),
                );
                await ctx.run('finalize-expired', () =>
                    gameService.finalizeStateSession(session, boards, GAME_SESSION_STATUS.EXPIRED),
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
