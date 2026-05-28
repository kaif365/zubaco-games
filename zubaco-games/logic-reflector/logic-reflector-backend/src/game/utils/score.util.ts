/**
 * Score formula for Logic Reflector.
 * Solved board = 1000 points; unsolved = 0.
 * A time bonus is added when the game is fully completed.
 */

/**
 * Calculate round score.
 *
 * @param {boolean} solved - whether the board laser puzzle was solved.
 *
 * @returns {number} The numeric result.
 */
export function calculateRoundScore(solved: boolean): number {
  return solved ? 1000 : 0;
}

/**
 * Calculate time bonus.
 *
 * @param {number} timeRemainingMs - time remaining ms value.
 * @param {number} timeLimitSeconds - time limit seconds value.
 *
 * @returns {number} The numeric result.
 */
export function calculateTimeBonus(
  timeRemainingMs: number,
  timeLimitSeconds: number,
): number {
  if (timeLimitSeconds === 0) {
    return 0;
  }
  const timeRemainingSeconds = timeRemainingMs / 1000;
  return Math.floor(
    (1000 * Math.max(0, timeRemainingSeconds)) / timeLimitSeconds,
  );
}
