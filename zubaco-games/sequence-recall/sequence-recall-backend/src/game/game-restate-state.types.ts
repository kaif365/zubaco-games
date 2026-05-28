// ── Restate Virtual Object state types ────────────────────────────────────────
//
// InFlightInput IDs are pre-generated UUIDs. They become real DB primary keys at
// finalizeAndCommit time so client-facing IDs are stable throughout the session.

export interface InFlightInput {
    id: string; // future GameInput.id
    tileId: number;
    isCorrect: boolean;
    isDemo: boolean;
    serverTime: string; // ISO timestamp
    roundIndex?: number; // 0-based round index (session.completedRounds before this move)
}

export interface SessionConfig {
    timeLimit: number;
    minSequence: number;
    maxSequence: number;
    flashDelay: number;
    levelDelay: number;
    bonusTimeRatio: number;
    scorePerClick: number;
    cellCount: number;
    wrongMoveHandling: number;
}

export interface InFlightSession {
    sessionId: string;
    userId: string;
    stageId: string;
    status: number; // GAME_SESSION_STATUS value
    serverSeed: string;
    expiryAtMs: number;
    startedAtMs: number;
    config: SessionConfig;
    // progress
    completedRounds: number;
    successfulRounds: number; // rounds completed without a wrong move on that round
    roundProgress: number; // correct tiles in current round
    successfulMoves: number;
    currentRound: number; // 1+ = actual round number
    currentActualRound: number;
    actualRoundRequested: number;
    hasAnyPreviousWrong: boolean;
    lastMoveAt: string | null; // ISO
    cachedSequence?: number[]; // pre-computed full sequence for maxSequence tiles — optional for backwards compat
}

// Keys used with ctx.get / ctx.set
export const STATE_KEY_SESSION = 'session' as const;
export const STATE_KEY_INPUTS = 'inputs' as const;
