import { createHash } from "crypto";

/**
 * Mulberry32 seeded PRNG — returns a function that yields [0, 1) values.
 *
 * @param {number} seed - 32-bit unsigned integer seed.
 *
 * @returns {() => number} Seeded RNG function.
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert a string seed to a uint32 by hashing it.
 *
 * @param {string} seed - Seed string.
 *
 * @returns {number} Uint32 number.
 */
export function seedToNumber(seed: string): number {
  const hash = createHash("sha256").update(seed).digest("hex");
  return parseInt(hash.slice(0, 8), 16) >>> 0;
}

/**
 * Compute the deterministic final seed from server seed, client seed and nonce.
 * finalSeed = sha256(serverSeed + ":" + clientSeed + ":" + nonce)
 *
 * @param {string} serverSeed - server seed value.
 * @param {string} clientSeed - client seed value.
 * @param {number} nonce - nonce value (round number).
 *
 * @returns {string} Hex final seed.
 */
export function computeFinalSeed(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): string {
  return createHash("sha256")
    .update(`${serverSeed}:${clientSeed}:${nonce}`)
    .digest("hex");
}

/**
 * Generate server seed.
 *
 * @returns {string} New random server seed.
 */
export function generateServerSeed(): string {
  return crypto.randomUUID();
}

/**
 * Generate a maze using iterative DFS (stack-based).
 *
 * Grid cells: 0 = path, 1 = wall.
 * rows and cols should be odd numbers (e.g. 21, 31, 41).
 * Start is always (1,1), End is always (rows-2, cols-2).
 *
 * @param {number} rows - Number of rows (odd).
 * @param {number} cols - Number of cols (odd).
 * @param {string} seed - Seed string for deterministic generation.
 *
 * @returns {number[][]} 2D maze grid.
 */
export function generateMaze(
  rows: number,
  cols: number,
  seed: string,
): number[][] {
  // Ensure odd dimensions
  const r = rows % 2 === 0 ? rows + 1 : rows;
  const c = cols % 2 === 0 ? cols + 1 : cols;

  // Initialize all cells as walls (1)
  const grid: number[][] = Array.from({ length: r }, () => Array(c).fill(1));

  const rng = mulberry32(seedToNumber(seed));

  // Carve start cell
  grid[1][1] = 0;

  // Stack-based DFS
  const stack: [number, number][] = [[1, 1]];
  const visited = new Set<string>();
  visited.add("1,1");

  while (stack.length > 0) {
    const [curRow, curCol] = stack[stack.length - 1];

    // Find unvisited neighbors 2 cells away
    const neighbors: [number, number][] = [];
    const directions: [number, number][] = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ];

    for (const [dr, dc] of directions) {
      const nr = curRow + dr;
      const nc = curCol + dc;
      if (
        nr > 0 &&
        nr < r - 1 &&
        nc > 0 &&
        nc < c - 1 &&
        !visited.has(`${nr},${nc}`)
      ) {
        neighbors.push([nr, nc]);
      }
    }

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      // Pick a random unvisited neighbor
      const idx = Math.floor(rng() * neighbors.length);
      const [nr, nc] = neighbors[idx];

      // Carve wall between current and neighbor
      const wallRow = curRow + (nr - curRow) / 2;
      const wallCol = curCol + (nc - curCol) / 2;
      grid[wallRow][wallCol] = 0;
      grid[nr][nc] = 0;

      visited.add(`${nr},${nc}`);
      stack.push([nr, nc]);
    }
  }

  // Ensure end cell is open
  grid[r - 2][c - 2] = 0;

  return grid;
}

/**
 * Compute shortest path length using BFS.
 *
 * @param {number[][]} grid - Maze grid (0=path, 1=wall).
 * @param {number} startRow - Start row.
 * @param {number} startCol - Start col.
 * @param {number} endRow - End row.
 * @param {number} endCol - End col.
 *
 * @returns {number} Shortest path length in moves, or -1 if unreachable.
 */
export function computeShortestPath(
  grid: number[][],
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): number {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = new Set<string>();
  const queue: [number, number, number][] = [[startRow, startCol, 0]]; // row, col, distance
  visited.add(`${startRow},${startCol}`);

  const directions: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  while (queue.length > 0) {
    const [row, col, dist] = queue.shift()!;

    if (row === endRow && col === endCol) {
      return dist;
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
        queue.push([nr, nc, dist + 1]);
      }
    }
  }

  return -1; // Unreachable
}

/**
 * Find the actual shortest path coordinates using BFS.
 *
 * @param {number[][]} grid - Maze grid (0=path, 1=wall).
 * @param {number} startRow - Start row.
 * @param {number} startCol - Start col.
 * @param {number} endRow - End row.
 * @param {number} endCol - End col.
 *
 * @returns {[number, number][]} Array of [row, col] coordinates.
 */
export function findShortestPath(
  grid: number[][],
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): [number, number][] {
  const rows = grid.length;
  const cols = grid[0].length;
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

  if (!found) return [];

  const path: [number, number][] = [];
  let current = `${endRow},${endCol}`;
  while (current) {
    const [r, c] = current.split(",").map(Number);
    path.push([r, c]);
    current = parentMap.get(current)!;
    if (current === `${startRow},${startCol}`) {
      path.push([startRow, startCol]);
      break;
    }
  }
  return path.reverse();
}
