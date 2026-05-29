// ── Game Status Enum ─────────────────────────────────────────────────────────
export const GameStatus = {
  STARTED: 1,
  ENDED: 2,
  EXPIRED: 3,
  RESULT_PROCESSING: 4,
  MANUALLY_ENDED: 5,
} as const;

export type GameStatusValue = (typeof GameStatus)[keyof typeof GameStatus];

export interface GameApiEnvelope<TData = unknown> {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: TData;
}

// ── Grid Size ────────────────────────────────────────────────────────────────
export interface GridSize {
  /** columns */
  x: number;
  /** rows */
  y: number;
}

// ── Game Board (single round) ────────────────────────────────────────────────
export interface GameBoard {
  sessionBoardId: string;
  id: string;
  roundNumber: number;
  gridSize: GridSize;
  fullImageUrl: string;
  displayTime: number;
  pieces: number[];
  /** Whether to render the number label on each tile. Defaults to true when absent. */
  enableNumbers?: boolean;
}

// ── Game Session (game-start response) ───────────────────────────────────────
export interface GameSession {
  sessionId?: string;
  startedAt?: string;
  status: GameStatusValue;
  expiryAt: string;
  totalRounds: number;
  board: GameBoard;
  scoreboard?: GameScoreboard;
}

// ── Scoreboard ───────────────────────────────────────────────────────────────
export interface RoundScore {
  roundNumber: number;
  score: number | null;
}

export interface GameScoreboard {
  rounds: RoundScore[];
  timeBonus: number;
  totalScore: number;
}

// ── Game Status Response ─────────────────────────────────────────────────────
export interface GameStatusResponse {
  status: GameStatusValue;
  sessionId?: string;
  startedAt?: string;
  expiryAt?: string;
  scoreboard?: GameScoreboard;
}

// ── Move ─────────────────────────────────────────────────────────────────────
export interface GameMove {
  slot: number;
  clickedAt: string;
  moveId: string;
}

// ── Submit Moves ─────────────────────────────────────────────────────────────
export interface SubmitMovesRequest {
  moves: GameMove[];
}

export interface SubmitMovesResponse {
  accepted: number;
}

// ── End Board ────────────────────────────────────────────────────────────────
export interface EndBoardResponse {
  roundScore: number;
  gameOver: boolean;
}

// ── End Game ─────────────────────────────────────────────────────────────────
export interface EndGameResponse {
  status: GameStatusValue;
  totalScore: number;
}

// ── Demo ─────────────────────────────────────────────────────────────────────
export interface DemoBoard {
  id: string;
  gridSize: GridSize;
  fullImageUrl: string;
  displayTime: number;
  initialPieces: number[];
}

export interface DemoLevel {
  levelName: string;
  boards: DemoBoard[];
}

export interface DemoResponse {
  alreadySeen: boolean;
  levels: DemoLevel[];
  enableDemo?: boolean;
}

// ── Persisted Live Session ────────────────────────────────────────────────────
export interface PersistedLiveSession {
  /** Auth JWT — restored into httpClient on recovery so API calls succeed */
  token: string;
  /** Server session identifier when provided by the backend */
  sessionId: string | null;
  expiryAt: string;
  /** Server-side session start timestamp used to anchor client move times */
  startedAt: string | null;
  /** Client Date.now() captured when startedAt was anchored */
  clientStartedAtMs: number | null;
  /** Local capture time for the persisted snapshot */
  capturedAtMs: number | null;
  totalRounds: number;
  currentRound: number;
  board: GameBoard;
  /** Current tile positions (may differ from board.pieces after player moves) */
  pieces: number[];
  /** Whether the player had already finished memorizing — skips the overlay on recovery */
  phase: 'memorizing' | 'playing';
  /** Unsent moves keyed by round number — hydrated back into useMoveSubmission on recovery */
  pendingMovesByRound: Record<string, GameMove[]>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface DevSessionRequest {
  stageId: string;
}

export interface DevSessionResponse {
  token: string;
}

export type GenerateShufflesResponse = number[][];

export interface GameConfig {
  levelId: string;
  name: string;
  gridSize: GridSize;
  fileUrl: string;
  shuffles: number[][];
}
