// ── Restate Virtual Object state types ───────────────────────────────────────
//
// InFlightBoard.id and InFlightMove.id are pre-generated UUIDs at board-pick
// time — they become the real DB primary keys at finalizeAndCommit, so FE-
// facing IDs are stable throughout the game.
//
// pieces[] is a flat array of length gridX*gridY.
// Index = slot position; value = piece index (0-based) or -1 for the blank.
// Solved state: pieces[i] === i for i < N-1, pieces[N-1] === -1.

export interface InFlightMove {
    id: string; // future GameMove.id
    clientMoveId: string;
    fromSlot: number; // slot the piece slid from
    toSlot: number; // slot it slid into (where the blank was)
    pieceIndex: number; // which piece moved; -1 if attempt was invalid
    success: boolean;
    clickedAt: string; // ISO timestamp
}

export interface InFlightBoard {
    id: string; // future GameSessionBoard.id
    boardId: string;
    levelId: string;
    gridX: number;
    gridY: number;
    fullImageUrl: string;
    displayTime: number; // seconds FE shows full image before shuffling
    enableNumbers: boolean;
    roundNumber: number;
    startedAt: string; // ISO
    endedAt: string | null;
    score: number | null;
    pieces: number[]; // mutable current state
    initialPieces: number[]; // immutable snapshot — persisted to DB at finalization
    moves: InFlightMove[];
}

export interface InFlightSession {
    sessionId: string;
    userId: string;
    stageId: string;
    expiryAtMs: number;
    timeLimitSeconds: number;
    enableNumbers: boolean;
    totalRounds: number;
    levelConfigs: {
        levelId: string;
        boardCount: number;
        displayTime: number;
        order: number;
        maxScore: number;
    }[];
    maxTimeBonus: number;
    currentRound: number;
    status: number; // GAME_SESSION_STATUS value
    lastMoveAt: string | null;
    lastMoveId: string | null;
    usedBoardIds: string[];
    startedAt: string; // ISO
}

export const STATE_KEY_SESSION = 'session' as const;
export const STATE_KEY_BOARDS = 'boards' as const;
