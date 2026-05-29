import type { ChangeEvent, GridCell } from '@/types/game';

import { mulberry32, randomInt, randomPick, shuffleArray } from './random';
import type { Rng } from './random';

const CELL_COLORS = [
  '#00f0ff', '#8b5cf6', '#f43f5e', '#22c55e', '#f59e0b',
  '#3b82f6', '#ec4899', '#14b8a6', '#a855f7', '#ef4444',
] as const;

const CELL_SHAPES = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'] as const;
const CHANGE_PROPERTIES: ChangeEvent['property'][] = ['color', 'shape', 'size', 'opacity'];

export interface RoundConfig {
  gridSize: number;
  changeCount: number;
  changeIntervalMs: number;
  displayDurationMs: number;
  seed: number;
}

export interface GeneratedRound {
  grid: GridCell[];
  changes: ScheduledChange[];
  totalDuration: number;
}

export interface ScheduledChange {
  cellId: number;
  property: ChangeEvent['property'];
  fromValue: string;
  toValue: string;
  activateAt: number;
  revertAt: number;
}

/**
 * Generate the initial grid of cells for a round.
 */
function generateGrid(gridSize: number, rng: Rng): GridCell[] {
  const cells: GridCell[] = [];
  const totalCells = gridSize * gridSize;

  for (let i = 0; i < totalCells; i++) {
    cells.push({
      id: i,
      type: randomPick(CELL_SHAPES, rng),
      color: randomPick(CELL_COLORS, rng),
      x: i % gridSize,
      y: Math.floor(i / gridSize),
    });
  }
  return cells;
}

/**
 * Generate a color change that differs from the current value.
 */
function generateColorChange(currentColor: string, rng: Rng): { from: string; to: string } {
  const available = CELL_COLORS.filter((c) => c !== currentColor);
  return { from: currentColor, to: randomPick(available, rng) };
}

/**
 * Generate a shape change that differs from the current value.
 */
function generateShapeChange(currentShape: string, rng: Rng): { from: string; to: string } {
  const available = CELL_SHAPES.filter((s) => s !== currentShape);
  return { from: currentShape, to: randomPick(available, rng) };
}

/**
 * Generate a size change.
 */
function generateSizeChange(rng: Rng): { from: string; to: string } {
  const sizes = ['0.8', '1.0', '1.2', '1.4'];
  const from = '1.0';
  const to = randomPick(sizes.filter((s) => s !== from), rng);
  return { from, to };
}

/**
 * Generate an opacity change.
 */
function generateOpacityChange(rng: Rng): { from: string; to: string } {
  const from = '1.0';
  const to = String(randomInt(3, 7, rng) / 10);
  return { from, to };
}

/**
 * Generate all scheduled changes for a round.
 * Changes happen at staggered intervals, each lasting displayDurationMs.
 * This is what makes the game AI-proof: changes are animated and temporal,
 * a screenshot can never capture the full picture.
 */
export function generateRound(config: RoundConfig): GeneratedRound {
  const rng = mulberry32(config.seed);
  const grid = generateGrid(config.gridSize, rng);

  // Determine which cells will change (no duplicates in same time window)
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

    // Stagger changes over time
    const activateAt = i * config.changeIntervalMs + randomInt(0, config.changeIntervalMs / 2, rng);
    const revertAt = activateAt + config.displayDurationMs;

    changes.push({ cellId, property, fromValue: from, toValue: to, activateAt, revertAt });
  }

  // Sort by activation time
  changes.sort((a, b) => a.activateAt - b.activateAt);

  const totalDuration = changes.length > 0
    ? changes[changes.length - 1].revertAt + 1000
    : config.changeIntervalMs * config.changeCount;

  return { grid, changes, totalDuration };
}
