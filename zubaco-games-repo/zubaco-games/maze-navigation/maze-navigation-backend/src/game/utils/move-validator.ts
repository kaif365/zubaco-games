const DIRECTION_DELTAS: Record<string, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

/**
 * Validate a maze move — checks if the target cell is within bounds and is a path (0).
 *
 * @param {number[][]} grid - Maze grid (0=path, 1=wall).
 * @param {number} currentRow - Current player row.
 * @param {number} currentCol - Current player col.
 * @param {string} direction - Direction: 'up'|'down'|'left'|'right'.
 * @param {number} rows - Total grid rows.
 * @param {number} cols - Total grid cols.
 *
 * @returns {{ success: boolean; toRow: number; toCol: number }} Validation result.
 */
export function validateMazeMove(
  grid: number[][],
  currentRow: number,
  currentCol: number,
  direction: string,
  rows: number,
  cols: number,
): { success: boolean; toRow: number; toCol: number } {
  const delta = DIRECTION_DELTAS[direction];
  if (!delta) {
    return { success: false, toRow: currentRow, toCol: currentCol };
  }

  const toRow = currentRow + delta.dr;
  const toCol = currentCol + delta.dc;

  // Out of bounds
  if (toRow < 0 || toRow >= rows || toCol < 0 || toCol >= cols) {
    return { success: false, toRow: currentRow, toCol: currentCol };
  }

  // Wall
  if (grid[toRow][toCol] === 1) {
    return { success: false, toRow: currentRow, toCol: currentCol };
  }

  return { success: true, toRow, toCol };
}
