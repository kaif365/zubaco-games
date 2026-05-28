import { appConfig } from '@/app/config/appConfig';
import { gameHttpClient } from '@/services/httpClient';
import type {
  DemoResponse,
  EndBoardResponse,
  EndGameResponse,
  GameApiEnvelope,
  GameBoard,
  GameMove,
  GameSession,
  GameStatusResponse,
  GenerateShufflesResponse,
  SubmitMovesResponse,
} from '@/types/sliding-puzzle';

/**
 * All game API calls matching the test client exactly.
 * Responses keep the server envelope so callers can inspect success/status/message.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toEnvelope<T>(response: { data: GameApiEnvelope<T> | T }): GameApiEnvelope<T> {
  const payload = response.data;

  if (
    isRecord(payload) &&
    ('success' in payload || 'statusCode' in payload || 'message' in payload || 'data' in payload)
  ) {
    return {
      success: typeof payload.success === 'boolean' ? payload.success : true,
      statusCode: typeof payload.statusCode === 'number' ? payload.statusCode : undefined,
      message: typeof payload.message === 'string' ? payload.message : undefined,
      data: payload.data as T | undefined,
    };
  }

  return { success: true, data: payload as T };
}

export class GameApiEnvelopeError<T = unknown> extends Error {
  readonly envelope: GameApiEnvelope<T>;

  constructor(response: GameApiEnvelope<T>, fallbackMessage = 'Game API request failed') {
    super(response.message ?? fallbackMessage);
    this.name = 'GameApiEnvelopeError';
    this.envelope = response;
  }
}

export function ensureGameApiSuccess<T>(response: GameApiEnvelope<T>): GameApiEnvelope<T> {
  if (!response.success) {
    throw new GameApiEnvelopeError(response);
  }
  return response;
}

export function requireGameApiData<T>(
  response: GameApiEnvelope<T>,
  fallbackMessage = 'Game API response missing data',
): T {
  ensureGameApiSuccess(response);

  if (response.data == null) {
    throw new Error(response.message ?? fallbackMessage);
  }

  return response.data;
}

/** GET /v1/user/demo */
export async function getDemo(): Promise<GameApiEnvelope<DemoResponse>> {
  const res = await gameHttpClient.get<GameApiEnvelope<DemoResponse>>('/v1/user/demo');
  return toEnvelope(res);
}

/** POST /v1/game/game-start */
export async function gameStart(): Promise<GameApiEnvelope<GameSession>> {
  const res = await gameHttpClient.post<GameApiEnvelope<GameSession>>('/v1/game/game-start', {
    stageId: appConfig.game.stageId,
  });
  return toEnvelope(res);
}

/** POST /v1/game/submit-moves */
export async function submitMoves(
  moves: GameMove[],
): Promise<GameApiEnvelope<SubmitMovesResponse>> {
  const res = await gameHttpClient.post<GameApiEnvelope<SubmitMovesResponse>>(
    '/v1/game/submit-moves',
    {
      moves,
    },
  );
  return toEnvelope(res);
}

/** POST /v1/game/end-board */
export async function endBoard(): Promise<GameApiEnvelope<EndBoardResponse>> {
  const res = await gameHttpClient.post<GameApiEnvelope<EndBoardResponse>>('/v1/game/end-board');
  return toEnvelope(res);
}

/** POST /v1/game/end-game (forfeit) */
export async function endGame(): Promise<GameApiEnvelope<EndGameResponse>> {
  const res = await gameHttpClient.post<GameApiEnvelope<EndGameResponse>>('/v1/game/end-game');
  return toEnvelope(res);
}

/** GET /v1/game/next-board */
export async function getNextBoard(): Promise<GameApiEnvelope<GameBoard>> {
  const res = await gameHttpClient.get<GameApiEnvelope<GameBoard>>('/v1/game/next-board');
  return toEnvelope(res);
}

/** GET /v1/game/status */
export async function getGameStatus(): Promise<GameApiEnvelope<GameStatusResponse>> {
  const res = await gameHttpClient.get<GameApiEnvelope<GameStatusResponse>>('/v1/game/status');
  return toEnvelope(res);
}

/** GET /v1/board-tools/generate-shuffles */
export async function generateShuffles(
  gridX: number,
  gridY: number,
  count: number,
): Promise<GameApiEnvelope<GenerateShufflesResponse>> {
  const res = await gameHttpClient.get<GameApiEnvelope<GenerateShufflesResponse>>(
    '/v1/board-tools/generate-shuffles',
    {
      params: { gridX, gridY, count },
    },
  );
  return toEnvelope(res);
}
