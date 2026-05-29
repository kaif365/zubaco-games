/**
 * Calculate score for a single maze round based on path efficiency.
 *
 * @param {boolean} reachedEnd - Whether the player reached the end.
 * @param {number} moveCount - Total successful moves made.
 * @param {number} shortestPathLength - BFS optimal path length.
 *
 * @returns {number} Round score 0-1000.
 */
export function calculateRoundScore(
  reachedEnd: boolean,
  moveCount: number,
  shortestPathLength: number,
): number {
  if (!reachedEnd) {
    return 0;
  }
  // Efficiency: optimal/actual, capped at 1, minimum score of 100 if reached end
  const efficiency = Math.min(
    1,
    shortestPathLength / Math.max(moveCount, shortestPathLength),
  );
  return Math.max(100, Math.floor(1000 * efficiency));
}

/**
 * Calculate time bonus based on remaining time at game end.
 *
 * @param {number} remainingMs - Remaining time in milliseconds.
 * @param {number} timeLimitSeconds - Total game time limit in seconds.
 *
 * @returns {number} Time bonus score.
 */
export function calculateTimeBonus(
  remainingMs: number,
  timeLimitSeconds: number,
): number {
  if (remainingMs <= 0) {
    return 0;
  }
  const remainingSeconds = remainingMs / 1000;
  const pct = remainingSeconds / timeLimitSeconds;
  return Math.floor(pct * 500); // up to 500 bonus points
}
