/** Game session lifecycle status from API (see README §3.6). */
export type GameSessionStatusCode = 1 | 2 | 3 | 4 | 5;

export interface GameScoreboardDto {
  totalScore: number;
  timeBonus: number;
  rounds: unknown[];
}

export interface GameMazeDto {
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
  /** Present on some API payloads; optional for client typing. */
  unlockRow?: number;
  unlockCol?: number;
  reachedEnd: boolean;
}

/** `POST /v1/game/game-start` and `GET /v1/game/status` (active session). */
export interface GameSessionResponse {
  status: GameSessionStatusCode;
  sessionId: string;
  startedAt: string;
  expiryAt: string;
  totalRounds: number;
  /** Boards finished this session (status API); may be absent on older payloads. */
  completedBoards?: number;
  maze: GameMazeDto | null;
  scoreboard: GameScoreboardDto;
}

export type GameStartResponse = GameSessionResponse;

export type GameStatusResponse = GameSessionResponse;

export type MoveDirection = "up" | "down" | "left" | "right";

export interface GameMoveDto {
  moveId: string;
  direction: MoveDirection;
  movedAt: string;
}

export interface SubmitMovesRequest {
  moves: GameMoveDto[];
}

export interface SubmitMovesResponse {
  accepted: number;
  startedAt: string;
  expiryAt: string;
}

export type NextBoardResponse = GameMazeDto;

export interface EndBoardResponse {
  gameOver: boolean;
  roundScore: number;
}

export interface EndGameResponse {
  status: 2 | 3 | 4 | 5;
  totalScore: number;
  timeBonus: number;
}
