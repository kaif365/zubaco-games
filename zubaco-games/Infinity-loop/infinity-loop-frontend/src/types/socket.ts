export interface RotatePayload {
  r: number;
  c: number;
  timestamp: number;
  boardId: string | null;
}

export interface RotateBatchMove {
  r: number;
  c: number;
  timestamp: number;
  boardId: string | null;
}

export interface RotateBatchPayload {
  moves: RotateBatchMove[];
}

export interface PuzzlePayload {
  grid: number[][];
  rows: number;
  cols: number;
  moves: number;
  remainingTime?: number;
  timeLimit?: number;
}

export interface BoardPayload {
  id: string;
  gridX: number;
  gridY: number;
  grid: number[][];
  moves?: number;
  remainingTime?: number;
  timeLimit?: number;
  color?: string | null;
}

export interface GameStartedConfig {
  remainingTime?: number;
  timeLimit?: number;
}

export interface GameStartedData {
  gameSessionId: string;
  boardsTotal?: number;
  stage: number;
  board?: BoardPayload;
  // Keep optional legacy payload support while transitioning BE contracts.
  puzzle?: PuzzlePayload;
  config: GameStartedConfig | null;
}

export interface GameStartedResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: GameStartedData;
}

export interface RotateResponseData {
  grid: number[][];
  isBoardSolved: boolean;
  isStageComplete: boolean;
  nextBoard?: BoardPayload | null;
  moves: number;
  score?: number;
  boardsCompleted?: number;
  boardsTotal?: number;
  totalScore?: number;
  completedLevel?: string;
  message?: string;
}

export interface RotateResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: RotateResponseData;
}

export interface GameCompleteData {
  score: number;
  timeBonus?: number;
  /** e.g. `TIME_UP` when the stage ends because the clock expired */
  reason?: string;
  boardsCompleted?: number;
  boardsTotal?: number;
}

export interface GameCompleteResponse {
  success: boolean;
  message: string;
  data: GameCompleteData;
}

export interface AlreadyFinishedData {
  stage: number;
  status: string;
  score: number;
  boardsCompleted: number;
  boardsTotal: number;
  message: string;
}

export interface AlreadyFinishedResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: AlreadyFinishedData;
}

export interface GameMetaStageLevel {
  level: string;
  boardCount: number;
  curated: boolean;
  timeLimit: number;
}

export interface GameMetaData {
  stages: Record<string, GameMetaStageLevel[]>;
  tokenExpirationTime?: number;
}

export interface GameMetaResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: GameMetaData;
}
