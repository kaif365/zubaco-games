export type Direction = "up" | "down" | "left" | "right";

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
  arrows: Omit<ArrowPiece, "id">[];
}

export type Board = (ArrowPiece | null)[][];

export const MAX_LIVES = 6;

export interface GameState {
  levelIndex: number;
  board: Board;
  moves: number;
  lives: number;
  status: "playing" | "won" | "gameover";
}

export type GameAction =
  | { type: "REMOVE_ARROW"; id: string }
  | { type: "WRONG_MOVE" }
  | { type: "RESET_LEVEL" }
  | { type: "NEXT_LEVEL" }
  | { type: "GOTO_LEVEL"; index: number };
