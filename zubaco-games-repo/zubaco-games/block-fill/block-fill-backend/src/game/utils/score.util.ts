/**
 * Score formula for block-fill.
 * Score equals whole seconds remaining when the puzzle is completed.
 */
export function calculateScore(opts: {
    gameType: string;
    completed: boolean;
    progressCount: number;
    totalCount: number;
    timeTakenMs: number;
    timeLimitSeconds: number;
}): number {
    const { completed, progressCount, totalCount, timeTakenMs, timeLimitSeconds } = opts;
    if (totalCount === 0) {
        return 0;
    }
    if (completed) {
        return Math.max(0, Math.round(timeLimitSeconds - timeTakenMs / 1000));
    }

    return Math.round((999 * progressCount) / totalCount);
}
