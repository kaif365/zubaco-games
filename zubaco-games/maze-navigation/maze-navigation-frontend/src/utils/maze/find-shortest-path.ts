export type MazePathCell = readonly [row: number, col: number];

/**
 * Shortest path on a grid maze (0 = walkable, 1 = wall) via BFS.
 */
export function findShortestPath(
  grid: number[][],
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): MazePathCell[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) {
    return [];
  }

  const visited = new Set<string>();
  const queue: [number, number][] = [[startRow, startCol]];
  const parentMap = new Map<string, string>();

  visited.add(`${startRow},${startCol}`);

  const directions: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  let found = false;

  while (queue.length > 0) {
    const [row, col] = queue.shift()!;

    if (row === endRow && col === endCol) {
      found = true;
      break;
    }

    for (const [dr, dc] of directions) {
      const nr = row + dr;
      const nc = col + dc;
      const key = `${nr},${nc}`;
      if (
        nr >= 0 &&
        nr < rows &&
        nc >= 0 &&
        nc < cols &&
        grid[nr][nc] === 0 &&
        !visited.has(key)
      ) {
        visited.add(key);
        parentMap.set(key, `${row},${col}`);
        queue.push([nr, nc]);
      }
    }
  }

  if (!found) {
    return [];
  }

  const path: MazePathCell[] = [];
  let current: string | undefined = `${endRow},${endCol}`;
  while (current) {
    const [r, c] = current.split(",").map(Number);
    path.push([r, c]);
    const parent = parentMap.get(current);
    if (!parent || parent === `${startRow},${startCol}`) {
      path.push([startRow, startCol]);
      break;
    }
    current = parent;
  }

  return path.reverse();
}
