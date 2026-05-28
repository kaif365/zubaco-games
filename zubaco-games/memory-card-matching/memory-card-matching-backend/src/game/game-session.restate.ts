import {
  ERROR_CODES,
  GAME_CONFIGS,
  GAME_SESSION_STATUS,
  RESTATE_SERVICES,
  STATUS_CODES,
} from "@common/constants";
import * as restate from "@restatedev/restate-sdk";

import type { SaveProgressDto } from "./dto/save-progress.dto";
import {
  STATE_KEY_SESSION,
  type RestateSessionState,
} from "./game-restate-state.types";
import type { GameService } from "./game.service";
import { throwTerminalError } from "./restate-errors";

export interface StartGameRequest {
  ownerKey: string;
  stageId: string;
}

export interface CurrentSessionRequest {
  ownerKey: string;
}

export interface NextLevelRequest {
  ownerKey: string;
}

export interface SaveProgressRequest {
  ownerKey: string;
  payload: SaveProgressDto;
}

export interface CompleteBoardRequest {
  ownerKey: string;
}

export interface GameOverRequest {
  ownerKey: string;
  stageId: string;
}

export interface MarkResultProcessingRequest {
  sessionId: string;
}

export interface FinalizeExpiredRequest {
  sessionId: string;
}

function assertSession(
  session: RestateSessionState | null,
): asserts session is RestateSessionState {
  if (!session) {
    throwTerminalError(
      ERROR_CODES.NO_SESSION,
      "No active game session",
      STATUS_CODES.NOT_FOUND,
    );
  }
}

function assertOwnedSession(
  session: RestateSessionState,
  ownerKey: string,
): void {
  if (session.ownerKey !== ownerKey) {
    throwTerminalError(
      ERROR_CODES.SESSION_NOT_FOUND,
      "The requested session was not found",
      STATUS_CODES.NOT_FOUND,
    );
  }
}

function assertActive(
  session: RestateSessionState,
  nowMs: number,
  allowResultProcessing = false,
  allowGracePeriod = false,
): void {
  const allowedStatuses = allowResultProcessing
    ? [GAME_SESSION_STATUS.STARTED, GAME_SESSION_STATUS.RESULT_PROCESSING]
    : [GAME_SESSION_STATUS.STARTED];

  if (
    !allowedStatuses.includes(
      session.status as (typeof allowedStatuses)[number],
    )
  ) {
    throwTerminalError(
      ERROR_CODES.GAME_SESSION_NOT_ACTIVE,
      "The game session is no longer active",
      STATUS_CODES.CONFLICT,
    );
  }

  const cutoffMs = allowGracePeriod
    ? session.endTimeMs + GAME_CONFIGS.EXPIRY_GRACE_SECONDS * 1000
    : session.endTimeMs;
  if (nowMs > cutoffMs) {
    throwTerminalError(
      ERROR_CODES.GAME_SESSION_NOT_ACTIVE,
      "The game session is no longer active",
      STATUS_CODES.CONFLICT,
    );
  }
}

function assertFinalizable(
  session: RestateSessionState,
  allowResultProcessing = false,
): void {
  const allowedStatuses = allowResultProcessing
    ? [GAME_SESSION_STATUS.STARTED, GAME_SESSION_STATUS.RESULT_PROCESSING]
    : [GAME_SESSION_STATUS.STARTED];

  if (
    !allowedStatuses.includes(
      session.status as (typeof allowedStatuses)[number],
    )
  ) {
    throwTerminalError(
      ERROR_CODES.GAME_SESSION_NOT_ACTIVE,
      "The game session is no longer active",
      STATUS_CODES.CONFLICT,
    );
  }
}

export function createGameSessionRestateObject(gameService: GameService) {
  return restate.object({
    name: RESTATE_SERVICES.GAME_SESSION,
    handlers: {
      startGame: async (
        context: restate.ObjectContext,
        request: StartGameRequest,
      ) => {
        const existingSession =
          await context.get<RestateSessionState>(STATE_KEY_SESSION);
        const nowMs = await context.date.now();
        if (existingSession) {
          const refreshed = gameService.refreshSessionForNow(
            existingSession,
            nowMs,
          );
          if (refreshed !== existingSession) {
            context.set(STATE_KEY_SESSION, refreshed);
          }
          return gameService.buildStartGameResponse(refreshed);
        }

        const existingOpenSession = await context.run(
          "check-open-session",
          () => gameService.fetchOpenSession(request.ownerKey, request.stageId),
        );
        if (existingOpenSession) {
          throwTerminalError(
            ERROR_CODES.GAME_SESSION_RECOVERY_REQUIRED,
            "An open game session exists but Restate state is unavailable",
            STATUS_CODES.CONFLICT,
          );
        }

        const finalizedStageSession = await context.run(
          "check-finalized-stage-session",
          () =>
            gameService.fetchFinalizedStageSession(
              request.ownerKey,
              request.stageId,
            ),
        );
        if (finalizedStageSession) {
          throwTerminalError(
            ERROR_CODES.STAGE_ALREADY_PLAYED,
            "This stage has already been played and cannot be started again",
            STATUS_CODES.CONFLICT,
          );
        }

        const stageConfig = await context.run("fetch-stage-config", () =>
          gameService.getResolvedGameplayConfig(request.stageId),
        );
        const session = await context.run("build-session", () =>
          gameService.buildNewSession(request.ownerKey, stageConfig, nowMs),
        );

        context.set(STATE_KEY_SESSION, session);

        await context.run("schedule-expiry", () =>
          gameService.scheduleExpiry(session),
        );

        return gameService.buildStartGameResponse(session);
      },

      getCurrentSession: async (
        context: restate.ObjectContext,
        request: CurrentSessionRequest,
      ) => {
        const session =
          await context.get<RestateSessionState>(STATE_KEY_SESSION);
        assertSession(session);
        assertOwnedSession(session, request.ownerKey);
        const nowMs = await context.date.now();
        const refreshed = gameService.refreshSessionForNow(session, nowMs);
        if (refreshed !== session) {
          context.set(STATE_KEY_SESSION, refreshed);
        }

        return gameService.buildCurrentSessionResponse(refreshed, nowMs);
      },

      getNextLevel: async (
        context: restate.ObjectContext,
        request: NextLevelRequest,
      ) => {
        const session =
          await context.get<RestateSessionState>(STATE_KEY_SESSION);
        assertSession(session);
        assertOwnedSession(session, request.ownerKey);
        const nowMs = await context.date.now();
        const refreshed = gameService.refreshSessionForNow(session, nowMs);
        if (refreshed !== session) {
          context.set(STATE_KEY_SESSION, refreshed);
        }
        assertActive(refreshed, nowMs, true);

        return gameService.buildNextLevelResponse(refreshed);
      },

      saveProgress: async (
        context: restate.ObjectContext,
        request: SaveProgressRequest,
      ) => {
        const session =
          await context.get<RestateSessionState>(STATE_KEY_SESSION);
        assertSession(session);
        assertOwnedSession(session, request.ownerKey);
        const nowMs = await context.date.now();
        assertActive(session, nowMs, true);

        const result = gameService.applyProgress(
          session,
          request.payload,
          nowMs,
        );
        context.set(STATE_KEY_SESSION, result.nextState);

        return result.response;
      },

      completeBoard: async (
        context: restate.ObjectContext,
        request: CompleteBoardRequest,
      ) => {
        const session =
          await context.get<RestateSessionState>(STATE_KEY_SESSION);
        assertSession(session);
        assertOwnedSession(session, request.ownerKey);
        const nowMs = await context.date.now();
        assertActive(session, nowMs, true);

        const result = await gameService.completeBoard(session, nowMs);
        if (result.clearSession) {
          context.clearAll();
        } else {
          context.set(STATE_KEY_SESSION, result.nextState);
        }

        return result.response;
      },

      gameOver: async (
        context: restate.ObjectContext,
        request: GameOverRequest,
      ) => {
        const session =
          await context.get<RestateSessionState>(STATE_KEY_SESSION);
        if (!session) {
          const finalizedResponse = await context.run(
            "fetch-finalized-game-over",
            () =>
              gameService.getFinalizedGameOver(
                request.ownerKey,
                request.stageId,
              ),
          );

          if (finalizedResponse) {
            return finalizedResponse;
          }

          throwTerminalError(
            ERROR_CODES.SESSION_NOT_FOUND,
            "The requested session was not found",
            STATUS_CODES.NOT_FOUND,
          );
        }

        assertOwnedSession(session, request.ownerKey);
        const nowMs = await context.date.now();
        assertFinalizable(session, true);

        const response = await gameService.finalizeGameOver(
          gameService.refreshSessionForNow(session, nowMs),
          nowMs,
        );
        context.clearAll();

        return response;
      },

      getTimerState: async (
        context: restate.ObjectContext,
        request: CurrentSessionRequest,
      ) => {
        const session =
          await context.get<RestateSessionState>(STATE_KEY_SESSION);
        assertSession(session);
        assertOwnedSession(session, request.ownerKey);

        return gameService.getTimerState(session);
      },

      markResultProcessing: async (
        context: restate.ObjectContext,
        request: MarkResultProcessingRequest,
      ) => {
        const session =
          await context.get<RestateSessionState>(STATE_KEY_SESSION);
        if (!session) {
          context.console.warn(
            `markResultProcessing: state already cleared for session ${request.sessionId}`,
          );
          return;
        }

        if (session.status !== GAME_SESSION_STATUS.STARTED) {
          return;
        }

        context.set(STATE_KEY_SESSION, {
          ...session,
          status: GAME_SESSION_STATUS.RESULT_PROCESSING,
          updatedAt: new Date(await context.date.now()).toISOString(),
        });
      },

      finalizeExpired: async (
        context: restate.ObjectContext,
        request: FinalizeExpiredRequest,
      ) => {
        const session =
          await context.get<RestateSessionState>(STATE_KEY_SESSION);
        if (!session) {
          await context.run("finalize-missing-state", () =>
            gameService.expireOpenSessionWithoutRestateState(request.sessionId),
          );
          return;
        }

        const refreshed = gameService.refreshSessionForNow(
          session,
          session.endTimeMs,
        );
        await context.run("finalize-expired", () =>
          gameService.finalizeExpiredGameOver(refreshed, session.endTimeMs),
        );
        context.clearAll();
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
