/**
 * Server-side change schedule generator — mirrors frontend changeGenerator.ts exactly.
 * Used to validate player taps against actual changes.
 */

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(arr: T[], rng: Rng): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randomInt(min: number, max: number, rng: Rng): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomPick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

const CELL_COLORS = [
  '#00f0ff', '#8b5cf6', '#f43f5e', '#22c55e', '#f59e0b',
  '#3b82f6', '#ec4899', '#14b8a6', '#a855f7', '#ef4444',
] as const;

const CELL_SHAPES = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'] as const;
type ChangeProperty = 'color' | 'shape' | 'size' | 'opacity';
const CHANGE_PROPERTIES: ChangeProperty[] = ['color', 'shape', 'size', 'opacity'];

interface GridCell {
  id: number;
  type: string;
  color: string;
}

export interface ScheduledChange {
  cellId: number;
  property: ChangeProperty;
  fromValue: string;
  toValue: string;
  activateAt: number;
  revertAt: number;
}

export interface RoundConfig {
  gridSize: number;
  changeCount: number;
  changeIntervalMs: number;
  displayDurationMs: number;
  seed: number;
}

function generateGrid(gridSize: number, rng: Rng): GridCell[] {
  const cells: GridCell[] = [];
  const totalCells = gridSize * gridSize;
  for (let i = 0; i < totalCells; i++) {
    cells.push({
      id: i,
      type: randomPick(CELL_SHAPES, rng),
      color: randomPick(CELL_COLORS, rng),
    });
  }
  return cells;
}

function generateColorChange(currentColor: string, rng: Rng): { from: string; to: string } {
  const available = CELL_COLORS.filter((c) => c !== currentColor);
  return { from: currentColor, to: randomPick(available, rng) };
}

function generateShapeChange(currentShape: string, rng: Rng): { from: string; to: string } {
  const available = CELL_SHAPES.filter((s) => s !== currentShape);
  return { from: currentShape, to: randomPick(available, rng) };
}

function generateSizeChange(rng: Rng): { from: string; to: string } {
  const sizes = ['0.8', '1.0', '1.2', '1.4'];
  const from = '1.0';
  const to = randomPick(sizes.filter((s) => s !== from), rng);
  return { from, to };
}

function generateOpacityChange(rng: Rng): { from: string; to: string } {
  const from = '1.0';
  const to = String(randomInt(3, 7, rng) / 10);
  return { from, to };
}

/**
 * Regenerate the full change schedule from a seed — deterministic, matches FE exactly.
 */
export function generateChangeSchedule(config: RoundConfig): ScheduledChange[] {
  const rng = mulberry32(config.seed);
  const grid = generateGrid(config.gridSize, rng);

  const cellIndices = shuffleArray(
    Array.from({ length: grid.length }, (_, i) => i),
    rng,
  ).slice(0, config.changeCount);

  const changes: ScheduledChange[] = [];

  for (let i = 0; i < cellIndices.length; i++) {
    const cellId = cellIndices[i];
    const cell = grid[cellId];
    const property = randomPick(CHANGE_PROPERTIES, rng);

    let from: string;
    let to: string;

    switch (property) {
      case 'color': {
        const change = generateColorChange(cell.color, rng);
        from = change.from;
        to = change.to;
        break;
      }
      case 'shape': {
        const change = generateShapeChange(cell.type, rng);
        from = change.from;
        to = change.to;
        break;
      }
      case 'size': {
        const change = generateSizeChange(rng);
        from = change.from;
        to = change.to;
        break;
      }
      case 'opacity': {
        const change = generateOpacityChange(rng);
        from = change.from;
        to = change.to;
        break;
      }
    }

    const activateAt = i * config.changeIntervalMs + randomInt(0, Math.floor(config.changeIntervalMs / 2), rng);
    const revertAt = activateAt + config.displayDurationMs;

    changes.push({ cellId, property, fromValue: from, toValue: to, activateAt, revertAt });
  }

  changes.sort((a, b) => a.activateAt - b.activateAt);
  return changes;
}

/**
 * Validate a tap against the change schedule.
 * A tap is correct if cellId matches an active change at that relative timestamp.
 * We allow a tolerance window for network latency.
 */
export function validateTap(
  cellId: number,
  tapTimeRelative: number,
  changes: ScheduledChange[],
  toleranceMs = 500,
): boolean {
  return changes.some(
    (c) =>
      c.cellId === cellId &&
      tapTimeRelative >= c.activateAt - toleranceMs &&
      tapTimeRelative <= c.revertAt + toleranceMs,
  );
}
