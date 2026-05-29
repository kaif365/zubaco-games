/**
 * Score formula — per-round accumulation with a final time bonus.
 */

/**
 * Calculate round score.
 *
 * @param {boolean} completed - whether all arrows were cleared.
 * @param {number} arrowsRemoved - number of arrows removed.
 * @param {number} totalArrows - total arrows on the board.
 * @param {number} maxScore - maximum score awarded for a perfect clear (admin-configured per level).
 *
 * @returns {number} The numeric result.
 */
export function calculateRoundScore(
    completed: boolean,
    arrowsRemoved: number,
    totalArrows: number,
    maxScore: number,
): number {
    if (completed) {
        return maxScore;
    }
    if (totalArrows === 0) {
        return 0;
    }
    return Math.floor(((maxScore - 1) * arrowsRemoved) / totalArrows);
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
    if (timeLimitSeconds === 0) {
        return 0;
    }
    const timeRemainingSeconds = timeRemainingMs / 1000;
    return Math.floor((maxTimeBonus * Math.max(0, timeRemainingSeconds)) / timeLimitSeconds);
}

/**
 * Calculate total score (round score + time bonus).
 *
 * @param {{ completed: boolean; arrowsRemoved: number; totalArrows: number; timeTakenMs: number; timeLimitSeconds: number; maxScore: number; maxTimeBonus: number; }} opts - scoring inputs.
 *
 * @returns {number} The numeric result.
 */
export function calculateScore(opts: {
    completed: boolean;
    arrowsRemoved: number;
    totalArrows: number;
    timeTakenMs: number;
    timeLimitSeconds: number;
    maxScore: number;
    maxTimeBonus: number;
}): number {
    const {
        completed,
        arrowsRemoved,
        totalArrows,
        timeTakenMs,
        timeLimitSeconds,
        maxScore,
        maxTimeBonus,
    } = opts;
    const timeRemainingMs = Math.max(0, timeLimitSeconds * 1000 - timeTakenMs);

    const roundScore = calculateRoundScore(completed, arrowsRemoved, totalArrows, maxScore);
    const timeBonus = completed
        ? calculateTimeBonus(timeRemainingMs, timeLimitSeconds, maxTimeBonus)
        : 0;

    return roundScore + timeBonus;
}
