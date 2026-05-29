export enum Direction {
  UP = 1,
  DOWN = 2,
  LEFT = 4,
  RIGHT = 8,
}

export interface MazeCell {
  readonly x: number;
  readonly y: number;
  walls: number;
  visited: boolean;
}
