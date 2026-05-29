// /modules/game/logic/engine.ts
import { GridCell, TileType } from '@/types/tile';
import { getConnectionsForState } from '@/utils/tile';

export const isRotationEquivalent = (type: TileType, rot1: number, rot2: number): boolean => {
  if (type === TileType.CROSS || type === TileType.EMPTY) return true;
  if (type === TileType.STRAIGHT) return rot1 % 2 === rot2 % 2;
  return rot1 === rot2;
};

export const isCellConnectedCorrect = (grid: GridCell[][], x: number, y: number): boolean => {
  const cell = grid[y][x];
  const conn = getConnectionsForState(cell);
  const height = grid.length;
  const width = grid[0].length;

  if (conn.top) {
    if (y === 0 || !getConnectionsForState(grid[y - 1][x]).bottom) return false;
  } else if (y > 0 && getConnectionsForState(grid[y - 1][x]).bottom) return false;

  if (conn.bottom) {
    if (y === height - 1 || !getConnectionsForState(grid[y + 1][x]).top) return false;
  } else if (y < height - 1 && getConnectionsForState(grid[y + 1][x]).top) return false;

  if (conn.left) {
    if (x === 0 || !getConnectionsForState(grid[y][x - 1]).right) return false;
  } else if (x > 0 && getConnectionsForState(grid[y][x - 1]).right) return false;

  if (conn.right) {
    if (x === width - 1 || !getConnectionsForState(grid[y][x + 1]).left) return false;
  } else if (x < width - 1 && getConnectionsForState(grid[y][x + 1]).left) return false;

  return true;
};

export const checkWinCondition = (grid: GridCell[][]): boolean => {
  const height = grid.length;
  const width = grid[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isCellConnectedCorrect(grid, x, y)) return false;
    }
  }

  return true;
};
