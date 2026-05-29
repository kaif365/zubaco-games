import { Direction, type MazeCell } from "@/types/maze";

/**
 * Converts server `mazeGrid` (0 = path, 1 = wall tile) into `MazeCell` passage bits
 * for movement/junction logic: a direction bit is set when the neighbor in that
 * direction is also a path cell (same convention as `maze-gen`). Wall tiles are
 * still present in the array but are not used while the player stays on paths.
 */
export function gridToMazeCells(mazeGrid: number[][]): MazeCell[][] {
  const rows = mazeGrid.length;
  const cols = mazeGrid[0]?.length ?? 0;
  const open = (r: number, c: number): boolean => {
    if (r < 0 || c < 0 || r >= rows || c >= cols) {
      return false;
    }
    return mazeGrid[r][c] === 0;
  };

  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      let walls = 0;
      if (open(y - 1, x)) {
        walls |= Direction.UP;
      }
      if (open(y + 1, x)) {
        walls |= Direction.DOWN;
      }
      if (open(y, x - 1)) {
        walls |= Direction.LEFT;
      }
      if (open(y, x + 1)) {
        walls |= Direction.RIGHT;
      }
      return { x, y, walls, visited: false };
    }),
  );
}
