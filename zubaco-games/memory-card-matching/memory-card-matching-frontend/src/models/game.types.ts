export type CardContentType = 'symbol' | 'image' | 'color' | 'wordImage';
export type GameState = 'loading' | 'preview' | 'playing' | 'checkingMatch' | 'levelTransition' | 'finished';
export type GameResult = 'win' | 'lose';
export type AppScreen = 'start' | 'menu' | 'instructions' | 'demo' | 'gameplay' | 'gameover' | 'levels' | 'daily' | 'achievements' | 'stats' | 'settings';

export type AnalyticsEventName =
  | 'game_started'
  | 'card_flipped'
  | 'pair_matched'
  | 'pair_mismatched'
  | 'level_complete'
  | 'game_won'
  | 'game_lost';

/** Maps to the StageId used by micro-screens (1–4). */
export type StageNumber = 1 | 2 | 3 | 4;

/** Global game settings returned by GET /api/v1/game/config. */
export interface GameConfig {
  gameTimeLimitSeconds: number;
  totalLevels: number;
  showDemo: boolean;
  stageNumber: StageNumber;
}

/**
 * A single card as served by the backend — no runtime flip/match state.
 * Frontend adds isFlipped and isMatched to produce MemoryCard.
 */
export interface LevelCard {
  id: string;
  pairId: string;
  contentType: CardContentType;
  content: string;
  imageUrl: string | null;
  isTurned?: boolean;
}

/** One admin-authored level with its grid config and shuffled cards. */
export interface LevelData {
  levelIndex: number;
  gridRows: number;
  gridColumns: number;
  cardContentType: CardContentType;
  previewDurationSeconds: number;
  mismatchDisplayDurationSeconds: number;
  cards: LevelCard[];
}

/** MemoryCard extends LevelCard with frontend-only flip/match state. */
export interface MemoryCard {
  id: string;
  pairId: string;
  contentType: CardContentType;
  content: string;
  imageUrl?: string | null;
  isFlipped: boolean;
  isMatched: boolean;
}

// ---------------------------------------------------------------------------
// API payloads and responses
// ---------------------------------------------------------------------------

/** Response from POST /api/v1/game/start. */
export interface StartGameResponse {
  sessionId: string;
  firstLevel: LevelData;
  startTime: string;
  endTime: string;
}

/** Response from GET /api/v1/game/level/next. */
export interface NextLevelResponse {
  level: LevelData;
}

/** Response from GET /v1/game/session/time-sync. */
export interface TimeSyncResponse {
  startTime: string;
  endTime: string;
  serverNow: string;
}

/** A matched pair with the ISO timestamp of when it was confirmed. */
export interface MatchedPairEntry {
  pairId: string;
  timestamp: string;
}

/** A single card click captured for batched save-progress payloads. */
export interface MoveEntry {
  id: string;
  clickedAt: string;
  moveId: string;
}

/** Response from POST /v1/game/session/complete-board. */
export interface CompleteBoardResponse {
  sessionId: string;
  status: string;
  currentLevelIndex: number;
  timeRemaining: number;
  matchedPairIds: string[];
  startTime: string;
  endTime: string;
  currentLevel?: LevelData;
}

/** Body for POST /v1/game/session/save-progress. */
export interface SaveProgressPayload {
  moves: MoveEntry[];
}

/** Response from GET /api/v1/game/session/current (null = no active session). */
export interface CurrentSessionResponse {
  sessionId: string;
  currentLevelIndex: number;
  timeRemaining: number;
  matchedPairs?: MatchedPairEntry[];
  startTime: string;
  endTime: string;
  currentLevel: LevelData;
}

/** Body for POST /v1/game/session/game-end. */
export interface GameOverPayload {
  sessionId: string;
}

/** Response from POST /api/v1/game/over. */
export interface GameOverResponse {
  finalScore: number;
  rank: number;
  roundsCompleted: number;
  totalRounds: number;
}

/** Stats shown on the game-over screen; finalScore and rank come from the API. */
export interface GameOverStats {
  result: GameResult;
  finalScore: number;
  rank: number;
  timeRemaining: number;
  timeTaken: number;
  levelsCompleted: number;
  totalLevels: number;
}

export interface AnalyticsEventPayload {
  event: AnalyticsEventName;
  timestamp: number;
  data?: Record<string, unknown>;
}
