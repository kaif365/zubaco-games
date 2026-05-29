import type { ArrowPiece, Board, GameSession, Level } from './types';
import { MAX_LIVES } from './types';

/**
 * Creates a fresh game session from a level definition.
 * Pure function — no side effects.
 */
export function createSession(level: Level, levelIndex: number): GameSession {
  const board = buildBoard(level);
  return {
    levelIndex,
    board,
    moves: 0,
    lives: MAX_LIVES,
    status: 'playing',
    history: [board],
    hintsUsed: 0,
    undosUsed: 0,
    streak: 0,
    maxStreak: 0,
    startedAt: Date.now(),
    score: 0,
  };
}

/**
 * Build a 2D board from a level definition.
 */
export function buildBoard(level: Level): Board {
  const board: Board = Array.from({ length: level.gridSize }, () =>
    Array(level.gridSize).fill(null),
  );
  level.arrows.forEach((a, i) => {
    const piece: ArrowPiece = { ...a, id: `arrow-${i}` };
    board[a.row][a.col] = piece;
  });
  return board;
}

/**
 * Checks if an arrow can be removed (no obstacles in its direction).
 */
export function canMove(arrow: ArrowPiece, board: Board): boolean {
  const { row, col, direction } = arrow;
  const size = board.length;
  switch (direction) {
    case 'up':
      for (let r = row - 1; r >= 0; r--) if (board[r][col]) return false;
      return true;
    case 'down':
      for (let r = row + 1; r < size; r++) if (board[r][col]) return false;
      return true;
    case 'left':
      for (let c = col - 1; c >= 0; c--) if (board[row][c]) return false;
      return true;
    case 'right':
      for (let c = col + 1; c < size; c++) if (board[row][c]) return false;
      return true;
  }
}

/**
 * Removes an arrow from the board. Returns new board (immutable).
 */
export function removeArrow(id: string, board: Board): Board {
  return board.map((row) => row.map((cell) => (cell?.id === id ? null : cell)));
}

/**
 * Checks if all arrows have been removed (win condition).
 */
export function isWon(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell === null));
}

/**
 * Gets all arrows currently on the board.
 */
export function getArrowsOnBoard(board: Board): ArrowPiece[] {
  const arrows: ArrowPiece[] = [];
  for (const row of board) {
    for (const cell of row) {
      if (cell) arrows.push(cell);
    }
  }
  return arrows;
}

/**
 * Gets all arrows that can currently be legally removed.
 */
export function getMovableArrows(board: Board): ArrowPiece[] {
  return getArrowsOnBoard(board).filter((arrow) => canMove(arrow, board));
}

/**
 * Finds a hint: returns the ID of an arrow that can be safely removed.
 * Returns null if no valid move exists (shouldn't happen in a solvable level).
 */
export function getHint(board: Board): string | null {
  const movable = getMovableArrows(board);
  if (movable.length === 0) return null;
  // Return the first movable arrow (could be smarter with DFS)
  return movable[0].id;
}

/**
 * Returns the number of remaining arrows on the board.
 */
export function getRemainingCount(board: Board): number {
  return getArrowsOnBoard(board).length;
}

/**
 * Deep clones a board (for undo history).
 */
export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}
