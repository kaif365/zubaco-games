// ── Restate Virtual Object state types ───────────────────────────────────────
//
// All IDs (InFlightBoard.id, InFlightArrow.id, InFlightMove.id) are pre-generated
// UUIDs at board-pick time. They become the real DB primary keys at finalizeSession,
// so FE-facing IDs are stable throughout the game.

export interface InFlightArrow {
    id: string; // future GameSessionArrow.id
    arrowId: string; // source Arrow.id
    waypoints: { x: number; y: number }[];
    headDirection: number;
    color: number;
    sortOrder: number;
    removedAt: string | null; // ISO timestamp or null
}

export interface InFlightMove {
    id: string; // future GameMove.id
    clientMoveId: string;
    removedArrowId: string | null; // InFlightArrow.id of the arrow removed by this move
    x: number;
    y: number;
    success: boolean;
    clickedAt: string; // ISO timestamp
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
    arrows: InFlightArrow[];
    moves: InFlightMove[];
}

export interface InFlightSession {
    sessionId: string;
    userId: string;
    stageId: string;
    expiryAtMs: number;
    timeLimitSeconds: number;
    totalRounds: number;
    levelConfigs: { levelId: string; boardCount: number; order: number; maxScore: number }[];
    maxTimeBonus: number;
    currentRound: number;
    status: number; // GAME_SESSION_STATUS value
    lastMoveAt: string | null;
    lastMoveId: string | null;
    usedBoardIds: string[]; // replaces the mid-game GameSessionBoard DB query
    startedAt: string; // ISO — for GameResponse
}

// Keys used with ctx.get / ctx.set
export const STATE_KEY_SESSION = 'session' as const;
export const STATE_KEY_BOARDS = 'boards' as const;
