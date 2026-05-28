import axios from "axios";
import type { Method } from "axios";

import type {
  GridPos,
  ServerArrow,
  ServerBoard,
  ServerEventPayload,
} from "@/game/gameTypes";
import {
  encryptPayload,
  decryptPayload,
  isEncryptedPayload,
} from "@/utils/crypto";
import {
  API_BASE,
  DEV_SESSION_URL,
  ENCRYPTION_KEY,
  IS_ENCRYPTION_ENABLED,
  REQUEST_TIMEOUT_MS,
  DEFAULT_STAGE_ID,
  GENERATED_BOARD_GRID_X,
  GENERATED_BOARD_GRID_Y,
  GENERATED_BOARD_TOKEN,
} from "@/constants/api";
import { storage } from "@/utils/storage";
import { LIVE_SESSION_STORAGE_KEY } from "@/constants/storage";

export { DEFAULT_STAGE_ID };

export class NoAuthTokenError extends Error {
  constructor(path: string) {
    super(`No auth token — skipping request to ${path}`);
    this.name = "NoAuthTokenError";
  }
}

export interface MoveEntry {
  x: number;
  y: number;
  clickedAt: string; // ISO timestamp
  moveId: string; // UUID v4 — used as idempotency key on the backend
}

export interface GameStartData {
  sessionId: string;
  startedAt?: string;
  expiryAt: string;
  totalRounds?: number;
  // roundNumber lives inside board, not at the top level
  board: ServerBoard & { roundNumber: number; sessionBoardId?: string };
}

export interface EndBoardData {
  // roundNumber is NOT returned by end-board — track it from the loaded board
  roundScore: number;
  gameOver: boolean;
  completed?: boolean;
  score?: number;
  roundsCompleted?: number;
  arrowsRemoved?: number;
  totalArrows?: number;
  timeBonus?: number;
  timeTakenSeconds?: number;
  roundScores?: Array<{ roundNumber: number; score: number }>;
}

export interface ScoreboardRound {
  roundNumber: number;
  score: number;
  startedAt?: string;
  endedAt?: string;
}

export interface ScoreboardData {
  totalScore?: number;
  timeBonus?: number;
  rounds?: ScoreboardRound[];
}

export interface GameStatusData {
  status?: number;
  sessionId?: string;
  startedAt?: string;
  expiryAt?: string;
  totalRounds?: number | null;
  board?: ServerBoard | null;
  scoreboard?: ScoreboardData | null;
  completed?: boolean;
  score?: number;
  roundsCompleted?: number;
  arrowsRemoved?: number;
  totalArrows?: number;
  timeBonus?: number;
  timeTakenSeconds?: number;
  roundScores?: Array<{ roundNumber: number; score: number }>;
}

export interface DemoLevelData {
  levelId?: string;
  levelName?: string;
  boards?: ServerBoard[];
}

export interface DemoData {
  stageId: string;
  alreadySeen: boolean;
  enableDemo?: boolean;
  levels: DemoLevelData[];
}

export interface GenerateBoardRequest {
  gridX: number;
  gridY: number;
}

type DevSessionPayload = {
  token?: string;
  accessToken?: string;
  data?: {
    token?: string;
    accessToken?: string;
  };
};

// next-board returns the board fields directly in data (no nested "board" key)
export interface NextBoardData {
  sessionBoardId?: string;
  id?: string;
  roundNumber: number;
  gridSize: GridPos;
  arrows: ServerArrow[];
}

export type GameStartResponse = ServerEventPayload<GameStartData>;
export type EndBoardResponse = ServerEventPayload<EndBoardData>;
export type NextBoardResponse = ServerEventPayload<NextBoardData>;
export type GameStatusResponse = ServerEventPayload<GameStatusData>;
export type DemoResponse = ServerEventPayload<DemoData>;
export type EndGameResponse = ServerEventPayload<GameStatusData>;
export type GenerateBoardResponse = ServerEventPayload<
  Pick<ServerBoard, "gridSize" | "arrows">
>;

type GameRequestOptions = {
  method?: Method;
  body?: unknown;
};

class GameApiClient {
  private token: string | null = null;

  private async doRequest<T>(
    path: string,
    method: string,
    data: unknown,
  ): Promise<T> {
    if (!this.token) {
      throw new NoAuthTokenError(path);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${this.token}`,
    };

    const response = await axios.request<unknown>({
      url: `${API_BASE}${path}`,
      method,
      headers,
      data,
      timeout: REQUEST_TIMEOUT_MS,
    });

    const raw = response.data;
    if (isEncryptedPayload(raw)) {
      return decryptPayload(raw, ENCRYPTION_KEY) as Promise<T>;
    }
    return raw as T;
  }

  private async request<T>(
    path: string,
    options: GameRequestOptions = {},
  ): Promise<T> {
    const { body: rawBody, method = "GET" } = options;

    let data = rawBody;
    if (IS_ENCRYPTION_ENABLED && rawBody !== undefined && rawBody !== null) {
      const encrypted = await encryptPayload(
        typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody,
        ENCRYPTION_KEY,
      );
      data = encrypted;
    }

    try {
      return await this.doRequest<T>(path, method, data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        // Token rejected — clear stale session, fetch a fresh token, retry once.
        storage.remove(LIVE_SESSION_STORAGE_KEY);
        this.token = null;
        await this.auth();
        return this.doRequest<T>(path, method, data);
      }
      throw err;
    }
  }

  async auth(stageId: string = DEFAULT_STAGE_ID): Promise<void> {
    const response = await axios.post<DevSessionPayload>(
      DEV_SESSION_URL,
      {
        stageId,
      },
      {
        headers: { "Content-Type": "application/json", Accept: "*/*" },
        timeout: REQUEST_TIMEOUT_MS,
      },
    );
    const payload = response.data;
    const token =
      payload.token ??
      payload.accessToken ??
      payload.data?.token ??
      payload.data?.accessToken;
    if (!token) throw new Error("Auth response missing token.");
    this.token = token;
  }

  async fetchDevSessionToken(
    stageId: string = DEFAULT_STAGE_ID,
  ): Promise<string> {
    await this.auth(stageId);
    const token = this.getToken();
    if (!token) throw new Error("Auth response missing token.");
    return token;
  }

  async gameStart(
    stageId: string = DEFAULT_STAGE_ID,
  ): Promise<GameStartResponse> {
    return this.request<GameStartResponse>("/v1/game/game-start", {
      method: "POST",
      body: { stageId },
    });
  }

  async submitMoves(
    moves: MoveEntry[],
  ): Promise<ServerEventPayload<{ processed: number }>> {
    return this.request<ServerEventPayload<{ processed: number }>>(
      "/v1/game/submit-moves",
      {
        method: "POST",
        body: {
          moves: moves.map(({ x, y, clickedAt, moveId }) => ({
            x,
            y,
            clickedAt,
            moveId,
          })),
        },
      },
    );
  }

  async nextBoard(): Promise<NextBoardResponse> {
    return this.request<NextBoardResponse>("/v1/game/next-board");
  }

  async endBoard(): Promise<EndBoardResponse> {
    return this.request<EndBoardResponse>("/v1/game/end-board", {
      method: "POST",
    });
  }

  async endGame(): Promise<EndGameResponse> {
    return this.request<EndGameResponse>("/v1/game/end-game", {
      method: "POST",
    });
  }

  async gameStatus(): Promise<GameStatusResponse> {
    return this.request<GameStatusResponse>("/v1/game/status");
  }

  async demo(): Promise<DemoResponse> {
    return this.request<DemoResponse>("/v1/user/demo");
  }

  async demoWithToken(token: string): Promise<DemoResponse> {
    this.setToken(token);
    return this.demo();
  }

  async generateBoard(
    body: GenerateBoardRequest = {
      gridX: GENERATED_BOARD_GRID_X,
      gridY: GENERATED_BOARD_GRID_Y,
    },
  ): Promise<GenerateBoardResponse> {
    const response = await axios.post<GenerateBoardResponse>(
      `${API_BASE}/v1/boards/generate`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${GENERATED_BOARD_TOKEN}`,
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
    );
    return response.data;
  }

  reset(): void {
    this.token = null;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const gameApiClient = new GameApiClient();
