import { logger } from "@/lib/default-logger";
import { httpGet, httpPost } from "@/services/fetcher";
import { handleServerError } from "@/services/service-error-handler";
import URL from "@/services/urls";
import type {
  EndBoardResponse,
  EndGameResponse,
  GameStartResponse,
  GameStatusResponse,
  NextBoardResponse,
  SubmitMovesRequest,
  SubmitMovesResponse,
} from "@/types/api/game";
import axios, { type AxiosError } from "axios";

interface GameApiEnvelope<T> {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: T;
}

/** Next-board when the sequence has no further maze (still must call end-board after). */
function isNoMoreMazesNextBoardRaw(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null || !("success" in raw)) {
    return false;
  }
  const env = raw as {
    success: boolean;
    statusCode?: number;
    message?: string;
  };
  if (env.success !== false) {
    return false;
  }
  if (env.statusCode === 422) {
    return true;
  }
  const msg = env.message ?? "";
  return /no more mazes/i.test(msg);
}

/** End-game when session is already torn down (duplicate call) — treat as no-op. */
function isEndGameSessionAlreadyGoneRaw(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null || !("success" in raw)) {
    return false;
  }
  const env = raw as {
    success: boolean;
    statusCode?: number;
    message?: string;
    data?: { clearData?: boolean };
  };
  if (env.success !== false) {
    return false;
  }
  if (env.statusCode === 404 && env.data?.clearData === true) {
    return true;
  }
  if (env.statusCode === 404) {
    return true;
  }
  const msg = env.message ?? "";
  return /session not found/i.test(msg);
}

/** Backend wraps payloads in `{ success, data, message }`; support direct `data` for tests. */
function unwrapGamePayload<T>(payload: unknown, fallbackMessage: string): T {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    "data" in payload
  ) {
    const envelope = payload as GameApiEnvelope<T>;
    if (!envelope.success || envelope.data === undefined) {
      throw new Error(envelope.message ?? fallbackMessage);
    }
    return envelope.data;
  }
  return payload as T;
}

const gameStart = async (): Promise<GameStartResponse> => {
  try {
    const raw = await httpPost<unknown, Record<string, never>>(
      URL.GAME_START,
      {},
    );
    return unwrapGamePayload<GameStartResponse>(raw, "Failed to start game");
  } catch (error) {
    logger.error("Failed to start game:", error);
    const { message, errors } = handleServerError(error);
    throw errors ?? message;
  }
};

const getStatus = async (): Promise<GameStatusResponse> => {
  try {
    const raw = await httpGet<unknown>(URL.GAME_STATUS);
    return unwrapGamePayload<GameStatusResponse>(
      raw,
      "Failed to fetch game status",
    );
  } catch (error) {
    logger.error("Failed to fetch game status:", error);
    const { message, errors } = handleServerError(error);
    throw errors ?? message;
  }
};

const submitMoves = async (
  body: SubmitMovesRequest,
): Promise<SubmitMovesResponse> => {
  try {
    const raw = await httpPost<unknown, SubmitMovesRequest>(
      URL.GAME_SUBMIT_MOVES,
      body,
    );
    return unwrapGamePayload<SubmitMovesResponse>(
      raw,
      "Failed to submit moves",
    );
  } catch (error) {
    logger.error("Failed to submit moves:", error);
    const { message, errors } = handleServerError(error);
    throw errors ?? message;
  }
};

const nextBoard = async (): Promise<NextBoardResponse | null> => {
  try {
    const raw = await httpGet<unknown>(URL.GAME_NEXT_BOARD);
    if (isNoMoreMazesNextBoardRaw(raw)) {
      return null;
    }
    return unwrapGamePayload<NextBoardResponse>(
      raw,
      "Failed to fetch next board",
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      return null;
    }
    const response = (error as AxiosError).response;
    const status = response?.status;
    const body = response?.data as { message?: string } | undefined;
    if (
      status === 422 ||
      (typeof body?.message === "string" && /no more mazes/i.test(body.message))
    ) {
      return null;
    }
    logger.error("Failed to fetch next board:", error);
    const { message, errors } = handleServerError(error);
    throw errors ?? message;
  }
};

const endBoard = async (): Promise<EndBoardResponse> => {
  try {
    const raw = await httpPost<unknown, Record<string, never>>(
      URL.GAME_END_BOARD,
      {},
    );
    return unwrapGamePayload<EndBoardResponse>(raw, "Failed to end board");
  } catch (error) {
    logger.error("Failed to end board:", error);
    const { message, errors } = handleServerError(error);
    throw errors ?? message;
  }
};

const endGame = async (): Promise<EndGameResponse | null> => {
  try {
    const raw = await httpPost<unknown, Record<string, never>>(
      URL.GAME_END_GAME,
      {},
    );
    if (isEndGameSessionAlreadyGoneRaw(raw)) {
      return null;
    }
    return unwrapGamePayload<EndGameResponse>(raw, "Failed to end game");
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    const response = (error as AxiosError).response;
    if (response?.status === 404) {
      return null;
    }
    logger.error("Failed to end game:", error);
    const { message, errors } = handleServerError(error);
    throw errors ?? message;
  }
};

const gameService = {
  gameStart,
  getStatus,
  submitMoves,
  nextBoard,
  endBoard,
  endGame,
};

export default gameService;
