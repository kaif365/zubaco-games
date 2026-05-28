/**
 * Score formula — per-round accumulation with a final time bonus.
 */

/**
 * Calculate round score.
 *
 * @param {boolean} completed - whether the puzzle was fully solved.
 * @param {number} correctPieces - number of correctly placed pieces.
 * @param {number} totalPieces - total pieces on the board.
 * @param {number} maxScore - maximum score awarded for a perfect solve (admin-configured per level).
 *
 * @returns {number} The numeric result.
 */
export function calculateRoundScore(
    completed: boolean,
    correctPieces: number,
    totalPieces: number,
    maxScore: number,
): number {
    void correctPieces;
    void totalPieces;
    if (completed) {
        return maxScore;
    }
    return 0;
}

/**
 * Calculate time bonus.
 *
 * @param {number} timeRemainingMs - time remaining in milliseconds at end of game.
 * @param {number} timeLimitSeconds - total stage time limit in seconds.
 * @param {number} maxTimeBonus - maximum time bonus awarded for finishing instantly (admin-configured per stage).
 *
 * @returns {number} The numeric result.
 */
export function calculateTimeBonus(
    timeRemainingMs: number,
    timeLimitSeconds: number,
    maxTimeBonus: number,
): number {
    if (timeLimitSeconds <= 0) {
        return 0;
    }
    const timeRemainingSeconds = timeRemainingMs / 1_000;
    return Math.floor((maxTimeBonus * Math.max(0, timeRemainingSeconds)) / timeLimitSeconds);
}

/**
 * Calculate total score (round score + time bonus).
 *
 * @param {{ completed: boolean; correctPieces: number; totalPieces: number; timeTakenMs: number; timeLimitSeconds: number; maxScore: number; maxTimeBonus: number; }} opts - scoring inputs.
 *
 * @returns {number} The numeric result.
 */
export function calculateScore(opts: {
    completed: boolean;
    correctPieces: number;
    totalPieces: number;
    timeTakenMs: number;
    timeLimitSeconds: number;
    maxScore: number;
    maxTimeBonus: number;
}): number {
    const {
        completed,
        correctPieces,
        totalPieces,
        timeTakenMs,
        timeLimitSeconds,
        maxScore,
        maxTimeBonus,
    } = opts;
    const timeRemainingMs = Math.max(0, timeLimitSeconds * 1_000 - timeTakenMs);
    const roundScore = calculateRoundScore(completed, correctPieces, totalPieces, maxScore);
    const bonus = completed
        ? calculateTimeBonus(timeRemainingMs, timeLimitSeconds, maxTimeBonus)
        : 0;
    return roundScore + bonus;
}
