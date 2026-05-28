// /modules/game/logic/generator.ts
import { checkWinCondition } from "./engine";
import { GridCell, TileType } from "@/types/tile";
import { getConnectionsForState, getTileFromConnections } from "@/utils/tile";

const buildCandidateGrid = (width: number, height: number): GridCell[][] => {
  const grid: GridCell[][] = [];

  // Initialize with empty tiles
  for (let y = 0; y < height; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        type: TileType.EMPTY,
        rotation: 0,
        correctRotation: 0,
        connections: { top: false, right: false, bottom: false, left: false },
        x,
        y,
        isCorrect: false,
      });
    }
    grid.push(row);
  }

  // Simple solvable generator:
  // We'll build random paths.
  // For a basic loop game, we can also just randomly assign types and then fix them to be closed.
  // However, a better approach is to fill with potential connections and then map them to types.

  const horizontalConnections = Array.from({ length: height }, () =>
    Array.from({ length: width - 1 }, () => Math.random() > 0.4),
  );
  const verticalConnections = Array.from({ length: height - 1 }, () =>
    Array.from({ length: width }, () => Math.random() > 0.4),
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const connections = {
        top: y > 0 ? verticalConnections[y - 1][x] : false,
        right: x < width - 1 ? horizontalConnections[y][x] : false,
        bottom: y < height - 1 ? verticalConnections[y][x] : false,
        left: x > 0 ? horizontalConnections[y][x - 1] : false,
      };

      const tileState = getTileFromConnections(connections);

      grid[y][x] = {
        ...grid[y][x],
        type: tileState.type,
        rotation: tileState.rotation,
        correctRotation: tileState.rotation,
        connections: tileState.connections,
      };
    }
  }

  return grid;
};

export const generateSolvableGrid = (
  width: number,
  height: number,
): GridCell[][] => {
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = buildCandidateGrid(width, height);
    if (checkWinCondition(candidate)) {
      return candidate;
    }
  }

  // Guaranteed fallback: simple closed rectangular loop.
  const fallback = buildCandidateGrid(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isBorder =
        y === 0 || y === height - 1 || x === 0 || x === width - 1;
      if (!isBorder) {
        fallback[y][x] = {
          ...fallback[y][x],
          type: TileType.EMPTY,
          rotation: 0,
          correctRotation: 0,
          connections: { top: false, right: false, bottom: false, left: false },
        };
        continue;
      }

      const top = y > 0 && (x === 0 || x === width - 1);
      const right = x < width - 1 && (y === 0 || y === height - 1);
      const bottom = y < height - 1 && (x === 0 || x === width - 1);
      const left = x > 0 && (y === 0 || y === height - 1);
      const tileState = getTileFromConnections({ top, right, bottom, left });

      fallback[y][x] = {
        ...fallback[y][x],
        type: tileState.type,
        rotation: tileState.rotation,
        correctRotation: tileState.rotation,
        connections: tileState.connections,
      };
    }
  }

  return fallback;
};

export const shuffleGrid = (grid: GridCell[][]): GridCell[][] => {
  return grid.map((row) =>
    row.map((cell) => {
      const rotation = Math.floor(Math.random() * 4);
      return {
        ...cell,
        rotation,
        connections: getConnectionsForState({ ...cell, rotation }),
      };
    }),
  );
};
