// Standard backend response envelope — all /v1/* endpoints wrap data in this shape
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

// Normalized error thrown by the http client after envelope inspection
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

// ─── GET /v1/game/config/{stageId} ─────────────────────────────────────────

export interface GameConfigResponse {
  stageId: string;
  timeLimit: number; // total session duration in seconds
  minSequence: number; // sequence length at round 1
  maxSequence: number; // max sequence length
  enableDemo?: boolean;
  flashDelay: number; // ms between tile flashes
  bonusTimeRatio: number;
  scorePerClick: number; // points per correct tile tap
  cellCount: number; // number of tiles on board
  totalRounds: number;
  totalDemoRounds?: number;
  wrongMoveHandling?: number;
  demoMinSequence?: number;
  demoMaxSequence?: number;
}

export const WRONG_MOVE_HANDLING = {
  GAME_END: 1,
  PLAY_AGAIN: 2,
  PREV_SEQUENCE: 3,
  NEXT_SEQUENCE: 4,
} as const;

export type WrongMoveHandlingMode = (typeof WRONG_MOVE_HANDLING)[keyof typeof WRONG_MOVE_HANDLING];

// ─── POST /v1/game/start ────────────────────────────────────────────────────

export interface GameStartRequest {
  stageId: string;
}

export interface GameStartResponse {
  gameSessionId?: string;
  sessionId?: string;
  isDemo?: boolean;
  isDemoMode?: boolean;
  currentRound: number;
  current_demo_round?: number;
  current_actual_round?: number;
  currentDemoRound?: number;
  currentActualRound?: number;
  sequence: number[];
  endTime: string | null; // null during demo rounds
  serverTime?: string;
  timeDelay?: number;
  flashDelay?: number;
  isResumed: boolean;
}

// ─── POST /v1/game/next-sequence ────────────────────────────────────────────

export interface NextSequenceRequest {
  gameSessionId: string;
  stageId: string;
  current_demo_round: number;
  current_actual_round: number;
}

export interface NextSequenceResponse {
  sequence: number[];
  isDemo?: boolean;
  isDemoMode?: boolean;
  currentRound: number;
  current_demo_round?: number;
  current_actual_round?: number;
  currentDemoRound?: number;
  currentActualRound?: number;
  status: string;
  currentScore: number;
  gameSessionId?: string;
  sessionId?: string;
  endTime: string | null; // set on first real round transition
}

// ─── POST /v1/game/validate ─────────────────────────────────────────────────

export interface SequenceEvent {
  sequence: number;
  sequenceTimestamp: string; // ISO 8601 timestamp of the tap
}

export interface ValidateRequest {
  gameSessionId: string;
  roundNumber: number;
  playerSequence: number[];
  sequenceEvents: SequenceEvent[];
  timestamp: string; // ISO 8601 round-completion time
  isCorrect: boolean;
}

export interface ValidateResponse {
  score: number;
  isFlagged: boolean;
}

// ─── POST /v1/game/game-over ────────────────────────────────────────────────

export type GameOverReason = 'COMPLETED' | 'TIME_UP';

export interface GameOverRequest {
  gameSessionId: string;
  reason: GameOverReason;
  completedRounds: number;
  timestamp: string;
}

export interface GameOverResponse {
  finalScore: number;
  completedRounds: number;
  successfulRounds: number;
  bonus: number;
  reason: GameOverReason;
}

// ─── GET /v1/game/time-sync ─────────────────────────────────────────────────

export interface TimeSyncResponse {
  startTime: string;
  endTime: string;
  serverNow: string;
}

// ─── GET /v1/game/current-session ────────────────────────────────────────────

export interface CurrentSessionResponse {
  sessionId: string;
  status: number;
  startTime: string;
  endTime: string | null;
  finalScore: number | null;
  completedActualRounds: number;
  completedRounds: number;
  successfulRounds: number;
  successfulMoves: number;
  roundProgress: number;
  currentRound: number;
  currentDemoRound?: number;
  currentActualRound: number;
  isDemoMode?: boolean;
  currentScore: number;
  hasAnyPreviousWrong: boolean;
  config: {
    timeLimit: number;
    minSequence: number;
    maxSequence: number;
    enableDemo?: boolean;
    demoMinSequence?: number;
    demoMaxSequence?: number;
    flashDelay: number;
    bonusTimeRatio: number;
    scorePerClick: number;
    cellCount: number;
    wrongMoveHandling: number;
  };
}
