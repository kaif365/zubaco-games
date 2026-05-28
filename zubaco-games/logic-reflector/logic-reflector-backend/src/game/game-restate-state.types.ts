// ── Restate Virtual Object state types ───────────────────────────────────────
//
// All IDs (InFlightBoard.id, InFlightBlock.id, InFlightMove.id) are pre-generated
// UUIDs at board-pick time. They become the real DB primary keys at finalizeSession,
// so FE-facing IDs are stable throughout the game.

export interface InFlightCell {
  row: number;
  col: number;
  cellType: number;
  orientation: number;
  direction: string | null; // emitter firing direction string stored in DB (N S E W NE NW SE SW)
  x: number;
  y: number;
}

export interface InFlightBlock {
  id: string; // future GameSessionBlock.id
  blockId: string | null; // source BoardBlock.id; null for inventory/player-created blocks
  row: number;
  col: number;
  blockType: number;
  orientation: number;
  isFixed: boolean;
  placedAt: string | null; // ISO timestamp — set when player places it; null if still in inventory
  removedAt: string | null; // ISO timestamp — set if player removes it
}

export interface InFlightAvailableBlock {
  blockType: number;
  totalCount: number;
  usedCount: number; // how many are placed on the board right now
}

export interface InFlightMove {
  id: string; // future GameMove.id
  clientMoveId: string;
  sessionBlockId: string | null; // InFlightBlock.id affected by this move
  row: number;
  col: number;
  blockType: number | null; // null when action === 'remove'
  action: "place" | "remove";
  success: boolean;
  placedAt: string; // ISO timestamp
}

export interface InitialBlock {
  id: string; // InFlightBlock.id — used to match sessionBlockId in moves
  row: number;
  col: number;
  blockType: number;
  orientation: number;
  isFixed: boolean;
}

export interface InFlightBoard {
  id: string; // future GameSessionBoard.id
  boardId: string;
  levelId: string;
  gridX: number;
  gridY: number;
  roundNumber: number;
  startedAt: string; // ISO
  endedAt: string | null; // ISO — set by endBoard
  score: number | null; // set by endBoard
  cells: InFlightCell[];
  blocks: InFlightBlock[];
  initialBlocks: InitialBlock[]; // immutable snapshot of blocks at board creation — used to replay moves for validation
  availableBlocks: InFlightAvailableBlock[];
  moves: InFlightMove[];
}

export interface InFlightSession {
  sessionId: string;
  userId: string;
  stageId: string;
  expiryAtMs: number;
  timeLimitSeconds: number;
  totalRounds: number;
  levelConfigs: { levelId: string; boardCount: number; order: number }[];
  currentRound: number;
  status: number; // GAME_SESSION_STATUS value
  lastMoveAt: string | null;
  lastMoveId: string | null;
  usedBoardIds: string[]; // replaces the mid-game GameSessionBoard DB query
  startedAt: string; // ISO — for GameResponse
}

// Keys used with ctx.get / ctx.set
export const STATE_KEY_SESSION = "session" as const;
export const STATE_KEY_BOARDS = "boards" as const;
