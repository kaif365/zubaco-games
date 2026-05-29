export type Direction = 'up' | 'down' | 'left' | 'right';

export interface ArrowPiece {
  id: string;
  row: number;
  col: number;
  direction: Direction;
}

export interface Level {
  id: number;
  title: string;
  gridSize: number;
  arrows: Omit<ArrowPiece, 'id'>[];
  /** Par moves for star rating */
  parMoves?: number;
  /** Time limit in ms (0 = no limit) */
  timeLimitMs?: number;
}

export type Board = (ArrowPiece | null)[][];

export const MAX_LIVES = 6;
export const MAX_HINTS = 3;
export const MAX_UNDOS = 5;

export interface GameSession {
  levelIndex: number;
  board: Board;
  moves: number;
  lives: number;
  status: 'playing' | 'won' | 'gameover';
  history: Board[];
  hintsUsed: number;
  undosUsed: number;
  streak: number;
  maxStreak: number;
  startedAt: number;
  score: number;
}

export interface ScoreResult {
  baseScore: number;
  timeBonus: number;
  streakBonus: number;
  penalty: number;
  total: number;
  stars: 1 | 2 | 3;
}
