// ── Directions & colors ───────────────────────────────────────────────────────
export type Direction = 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';
export type LaserColor = 'white';

// ── Cell types ────────────────────────────────────────────────────────────────
export type CellType =
  | 'empty'
  | 'emitter'
  | 'target'
  | 'reflect-block'
  | 'mirror-fwd' // /
  | 'mirror-bwd' // \
  | 'splitter'
  | 'blocker';

// Block types the player can place (subset of CellType)
export type BlockType = 'reflect-block' | 'mirror-fwd' | 'mirror-bwd' | 'splitter' | 'blocker';

// ── Grid structures ───────────────────────────────────────────────────────────
export interface ServerCell {
  id?: string;
  row: number;
  col: number;
  type: CellType;
  fixed: boolean; // player cannot place/remove
  direction?: Direction; // for emitter: beam fire direction
  x?: number; // optional board-space x, where each grid cell is 1 unit wide
  y?: number; // optional board-space y, where each grid cell is 1 unit tall
  radius?: number; // target hit radius in board-space units
  size?: number; // reflective/blocking square size in board-space units
  angle?: number; // optional emitter angle in degrees, 0 = east, 90 = south
  locksPlacement?: boolean;
}

export interface PlacedBlock {
  id?: string;
  row: number;
  col: number;
  type: BlockType;
  seeded?: boolean;
}

export interface AvailableBlock {
  type: BlockType;
  count: number;
}

// ── Level ─────────────────────────────────────────────────────────────────────
export interface GameLevel {
  levelId: string;
  sessionBoardId?: string;
  levelNumber: number;
  gridSize: { x: number; y: number };
  cells: ServerCell[]; // fixed cells from server
  initialBlocks?: PlacedBlock[]; // movable blocks already placed when the level starts
  availableBlocks?: AvailableBlock[]; // legacy/API fallback; editor JSON should prefer initialBlocks
}

// ── Game status ───────────────────────────────────────────────────────────────
export const GameStatus = {
  STARTED: 1,
  ENDED: 2,
  EXPIRED: 3,
  RESULT_PROCESSING: 4,
  MANUALLY_ENDED: 5,
} as const;

export type GameStatusValue = (typeof GameStatus)[keyof typeof GameStatus];

// ── Scoreboard ────────────────────────────────────────────────────────────────
export interface LevelScore {
  levelNumber: number;
  score: number | null;
  movesUsed?: number;
}

export interface GameScoreboard {
  levels: LevelScore[];
  totalScore: number;
  timeBonus?: number;
}

// ── Session ───────────────────────────────────────────────────────────────────
export interface GameSession {
  sessionId: string | null;
  stageId: string;
  status: GameStatusValue;
  expiryAt: string;
  startedAt: string | null;
  totalLevels: number;
  currentLevel: GameLevel;
  scoreboard?: GameScoreboard;
}

// ── Moves ─────────────────────────────────────────────────────────────────────
export interface GameMove {
  moveId: string;
  blockId?: string;
  row: number;
  col: number;
  blockType: BlockType | null; // null = remove block
  placedAt: string;
}

// ── API response types ────────────────────────────────────────────────────────
export interface GameApiEnvelope<T = unknown> {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: T;
}

export interface SubmitMovesResponse {
  accepted: number;
}

export interface EndBoardResponse {
  levelScore: number | null;
  gameOver: boolean;
}

export interface EndGameResponse {
  status: GameStatusValue;
}

export interface GameStatusResponse {
  sessionId?: string | null;
  status: GameStatusValue;
  startedAt?: string | null;
  expiryAt?: string;
  scoreboard?: GameScoreboard;
}

export interface DemoLevel {
  levelName: string;
  levels: GameLevel[];
}

export interface DemoResponse {
  stageId?: string;
  enableDemo: boolean;
  totalRounds?: number;
  alreadySeen?: boolean;
  boards: GameLevel[];
}

// ── Persisted live session ────────────────────────────────────────────────────
export interface PersistedLiveSession {
  token: string;
  sessionId: string | null;
  expiryAt: string;
  startedAt: string | null;
  clientStartedAtMs: number | null;
  capturedAtMs: number | null;
  totalLevels: number;
  currentLevelNumber: number;
  level: GameLevel;
  placedBlocks: PlacedBlock[];
  phase: 'playing';
  pendingMovesByLevel: Record<string, GameMove[]>;
}
