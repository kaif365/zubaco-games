import { type FlowDifficultyKey } from '@/features/flow-puzzle/config/gameConfig';
import type { GridCoord } from '@/features/flow-puzzle/types';

const COLOR_POOL = [
  { colorId: 'pink', colorHex: '#ff4bbd', glowHex: '#ff9ad9' },
  { colorId: 'cyan', colorHex: '#5cf2ff', glowHex: '#c7fbff' },
  { colorId: 'amber', colorHex: '#ffc247', glowHex: '#ffe29d' },
  { colorId: 'violet', colorHex: '#9f79ff', glowHex: '#d2c3ff' },
  { colorId: 'mint', colorHex: '#58f3c1', glowHex: '#b9fde7' },
  { colorId: 'orange', colorHex: '#ff8a54', glowHex: '#ffd1ba' },
  { colorId: 'rose', colorHex: '#ff5a7c', glowHex: '#ffbfcb' },
  { colorId: 'indigo', colorHex: '#6b7dff', glowHex: '#c4cbff' },
  { colorId: 'teal', colorHex: '#4de6d8', glowHex: '#bafcf5' },
  { colorId: 'gold', colorHex: '#ffd548', glowHex: '#ffefab' },
] as const;

const GENERATOR_BASE_DEFAULTS = {
  rows: 5,
  cols: 5,
};

const DIFFICULTY_RULES = {
  easy: {
    areaDivisorForPairs: 5,
    minSegmentLength: 4,
    minEndpointDistanceRatio: 0.2,
  },
  medium: {
    areaDivisorForPairs: 4,
    minSegmentLength: 4,
    minEndpointDistanceRatio: 0.28,
  },
  hard: {
    areaDivisorForPairs: 3,
    minSegmentLength: 5,
    minEndpointDistanceRatio: 0.38,
  },
} as const;

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seedText: string) {
  let state = hashString(seedText) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 10_000) / 10_000;
  };
}

function shuffleInPlace<T>(items: T[], rng: () => number) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
}

function buildSerpentinePath(rows: number, cols: number): GridCoord[] {
  const cells: GridCoord[] = [];

  for (let row = 0; row < rows; row += 1) {
    if (row % 2 === 0) {
      for (let col = 0; col < cols; col += 1) {
        cells.push({ row, col });
      }
    } else {
      for (let col = cols - 1; col >= 0; col -= 1) {
        cells.push({ row, col });
      }
    }
  }

  return cells;
}

function countUnvisitedNeighbors(
  cell: GridCoord,
  rows: number,
  cols: number,
  visited: boolean[][],
) {
  let count = 0;
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;

  for (const [rowDelta, colDelta] of deltas) {
    const nextRow = cell.row + rowDelta;
    const nextCol = cell.col + colDelta;
    if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) {
      continue;
    }
    if (!visited[nextRow][nextCol]) {
      count += 1;
    }
  }

  return count;
}

/**
 * Exhaustive DFS for a random Hamiltonian path is exponential; above modest sizes it freezes the UI.
 * Serpentine (and transpose + reverse variants) yields a valid full-grid path in O(rows*cols).
 */
function seedNeedsCheapHamiltonian(rows: number, cols: number) {
  return rows > 14 || cols > 14 || rows * cols > 196;
}

/** Deterministic zigzag spanning every cell once, with seeded transpose / reversal for variety. */
function buildSeedSerpentinePath(rows: number, cols: number, seed: string): GridCoord[] {
  const rng = createRng(`${seed}-serp`);
  const transpose = rng() < 0.5;
  const r = transpose ? cols : rows;
  const c = transpose ? rows : cols;
  const base = buildSerpentinePath(r, c);

  let path = transpose ? base.map((cell) => ({ row: cell.col, col: cell.row })) : base.slice();

  if (rng() < 0.5) {
    path.reverse();
  }
  const rotate180 = rng() < 0.5;
  if (rotate180) {
    path = path.map(({ row, col }) => ({
      row: rows - 1 - row,
      col: cols - 1 - col,
    }));
  }

  return path;
}

/** Iterative DFS so path length is not constrained by JS recursion limits on large grids. */
function attemptRandomHamiltonianPath(
  rows: number,
  cols: number,
  seed: string,
): GridCoord[] | null {
  const totalCells = rows * cols;

  type Frame = {
    cell: GridCoord;
    neighbors: GridCoord[];
    neighborIndex: number;
  };

  const rng = createRng(seed);
  const visited = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
  const path: GridCoord[] = [];
  const stack: Frame[] = [];

  const gatherNeighbors = (cell: GridCoord): GridCoord[] => {
    const neighbors: GridCoord[] = [];
    const deltas = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const;
    for (const [rowDelta, colDelta] of deltas) {
      const nextRow = cell.row + rowDelta;
      const nextCol = cell.col + colDelta;
      if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) continue;
      if (visited[nextRow][nextCol]) continue;
      neighbors.push({ row: nextRow, col: nextCol });
    }
    shuffleInPlace(neighbors, rng);
    neighbors.sort((left, right) => {
      const leftDegree = countUnvisitedNeighbors(left, rows, cols, visited);
      const rightDegree = countUnvisitedNeighbors(right, rows, cols, visited);
      return leftDegree - rightDegree;
    });
    return neighbors;
  };

  const startAttempts = Math.min(rows * cols, 30);
  for (let s = 0; s < startAttempts; s += 1) {
    const start: GridCoord = {
      row: Math.floor(rng() * rows),
      col: Math.floor(rng() * cols),
    };

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        visited[y][x] = false;
      }
    }
    path.length = 0;
    stack.length = 0;

    visited[start.row][start.col] = true;
    path.push(start);
    const startNeighbors = gatherNeighbors(start);

    stack.push({ cell: start, neighbors: startNeighbors, neighborIndex: -1 });

    let stepsWithoutProgress = 0;
    const maxIdleSteps = totalCells * 8;

    while (stack.length > 0 && path.length > 0) {
      const top = stack[stack.length - 1];
      top.neighborIndex += 1;

      if (top.neighborIndex >= top.neighbors.length) {
        visited[top.cell.row][top.cell.col] = false;
        path.pop();
        stack.pop();
        stepsWithoutProgress += 1;
        if (stepsWithoutProgress > maxIdleSteps) break;
        continue;
      }

      stepsWithoutProgress = 0;
      const next = top.neighbors[top.neighborIndex];
      visited[next.row][next.col] = true;
      path.push(next);

      if (path.length === totalCells) {
        return path;
      }

      stack.push({ cell: next, neighbors: gatherNeighbors(next), neighborIndex: -1 });
    }
  }

  return null;
}

function buildRandomHamiltonianPath(rows: number, cols: number, seed: string): GridCoord[] {
  if (seedNeedsCheapHamiltonian(rows, cols)) {
    return buildSeedSerpentinePath(rows, cols, seed);
  }

  const maxCheapAttempts = 40;
  for (let attempt = 0; attempt < maxCheapAttempts; attempt += 1) {
    const found = attemptRandomHamiltonianPath(rows, cols, `${seed}-path-${attempt}`);
    if (found) return found;
  }

  return buildSerpentinePath(rows, cols);
}

function manhattanDistance(left: GridCoord, right: GridCoord) {
  return Math.abs(left.row - right.row) + Math.abs(left.col - right.col);
}

function buildSegmentLengths(
  totalCells: number,
  pairCount: number,
  seed: string,
  minSegmentLength: number,
) {
  const rng = createRng(seed);
  const lengths = Array.from({ length: pairCount }, () => minSegmentLength);
  let remaining = totalCells - pairCount * minSegmentLength;

  let cursor = 0;
  while (remaining > 0) {
    const increment = Math.min(remaining, 1 + Math.floor(rng() * 2));
    lengths[cursor] += increment;
    remaining -= increment;
    cursor = (cursor + 1) % pairCount;
  }

  return lengths;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sanitizeNumber(value: number | undefined, fallback: number, min: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.floor(value ?? fallback));
}

function calculatePairCountForDifficulty(
  rows: number,
  cols: number,
  difficulty: FlowDifficultyKey,
) {
  const totalCells = rows * cols;
  const fromArea = Math.floor(totalCells / DIFFICULTY_RULES[difficulty].areaDivisorForPairs);
  return Math.min(COLOR_POOL.length, Math.max(2, fromArea));
}

function buildDifficultySegments(
  path: GridCoord[],
  pairCount: number,
  difficulty: FlowDifficultyKey,
  seedBase: string,
  rows: number,
  cols: number,
) {
  const rules = DIFFICULTY_RULES[difficulty];
  const minimumDistance = Math.max(2, Math.floor((rows + cols) * rules.minEndpointDistanceRatio));

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const segmentLengths = buildSegmentLengths(
      path.length,
      pairCount,
      `${seedBase}-segments-${attempt}`,
      rules.minSegmentLength,
    );

    let cursor = 0;
    const segments = segmentLengths.map((length) => {
      const segment = path.slice(cursor, cursor + length);
      cursor += length;
      return segment;
    });

    const isAcceptable = segments.every((segment) => {
      const start = segment[0];
      const end = segment[segment.length - 1];
      return manhattanDistance(start, end) >= minimumDistance;
    });

    if (isAcceptable) {
      return segments;
    }
  }

  const fallbackLengths = buildSegmentLengths(
    path.length,
    pairCount,
    `${seedBase}-segments-fallback`,
    rules.minSegmentLength,
  );
  let cursor = 0;
  return fallbackLengths.map((length) => {
    const segment = path.slice(cursor, cursor + length);
    cursor += length;
    return segment;
  });
}

export function generateDifficultyLevel(
  difficulty: FlowDifficultyKey,
  order: number,
  options?: {
    rows?: number;
    cols?: number;
    pairCount?: number;
  },
) {
  const rows = sanitizeNumber(options?.rows, GENERATOR_BASE_DEFAULTS.rows, 2);
  const cols = sanitizeNumber(options?.cols, GENERATOR_BASE_DEFAULTS.cols, 2);
  const rules = DIFFICULTY_RULES[difficulty];
  const maxPairs = Math.max(1, Math.floor((rows * cols) / rules.minSegmentLength));
  const autoPairCount = calculatePairCountForDifficulty(rows, cols, difficulty);
  const pairCount = Math.min(maxPairs, sanitizeNumber(options?.pairCount, autoPairCount, 1));
  const path = buildRandomHamiltonianPath(rows, cols, `${difficulty}-${order}`);
  const segments = buildDifficultySegments(
    path,
    pairCount,
    difficulty,
    `${difficulty}-${order}`,
    rows,
    cols,
  );

  const nodes = segments.map((segment, index) => {
    const color = COLOR_POOL[index];
    const start = segment[0];
    const end = segment[segment.length - 1];

    return {
      colorCode: color.colorId,
      points: [start, end],
    };
  });

  return {
    name: `${titleCase(difficulty)} Board ${String(order).padStart(2, '0')}`,
    gridRow: rows,
    gridCol: cols,
    nodes,
  };
}
