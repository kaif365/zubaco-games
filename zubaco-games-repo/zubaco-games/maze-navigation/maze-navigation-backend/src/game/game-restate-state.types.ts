// ── Restate Virtual Object state types ───────────────────────────────────────
//
// All IDs (InFlightMaze.id, InFlightMazeMove.id) are pre-generated UUIDs at
// maze-build time. They become the real DB primary keys at finalizeSession,
// so FE-facing IDs are stable throughout the game.

export interface InFlightMazeMove {
  id: string; // future GameMove.id
  clientMoveId: string;
  direction: string; // 'up'|'down'|'left'|'right'
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  success: boolean;
  movedAt: string; // ISO
}

export interface InFlightMaze {
  id: string; // future GameSessionMaze.id
  levelId: string;
  rows: number;
  cols: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number; // = roundNumber
  finalSeed: string;
  mazeGrid: number[][]; // 0=path, 1=wall
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  shortestPathLength: number;
  roundNumber: number;
  startedAt: string; // ISO
  endedAt: string | null; // ISO — set by endBoard
  score: number | null; // set by endBoard
  currentRow: number; // player position
  currentCol: number;
  unlockRow: number | null;
  unlockCol: number | null;
  templateId: string | null; // null when procedurally generated
  reachedEnd: boolean;
  moves: InFlightMazeMove[];
}

export interface InFlightSession {
  sessionId: string;
  userId: string;
  stageId: string;
  clientSeed: string; // from game-start request
  expiryAtMs: number;
  timeLimitSeconds: number;
  totalRounds: number;
  levelConfigs: { levelId: string; mazeCount: number; order: number }[];
  currentRound: number;
  status: number; // GAME_SESSION_STATUS value
  lastMoveAt: string | null;
  lastMoveId: string | null;
  startedAt: string; // ISO
  earlyUnlockCount: number; // how many times nextBoard was called before reachedEnd
}

// Keys used with ctx.get / ctx.set
export const STATE_KEY_SESSION = "session" as const;
export const STATE_KEY_MAZES = "mazes" as const;
