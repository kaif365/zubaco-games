import type { ObjectItem, GridPlacement, StageConfig } from '@/types/game';
import { mulberry32, seededShuffle } from './random';

/**
 * Available objects pool. Each has a unique emoji representation.
 */
const OBJECT_POOL: ObjectItem[] = [
  { id: 'star', type: 'shape', emoji: '?' },
  { id: 'heart', type: 'shape', emoji: '??' },
  { id: 'diamond', type: 'shape', emoji: '??' },
  { id: 'moon', type: 'shape', emoji: '??' },
  { id: 'sun', type: 'shape', emoji: '??' },
  { id: 'flower', type: 'nature', emoji: '??' },
  { id: 'tree', type: 'nature', emoji: '??' },
  { id: 'mushroom', type: 'nature', emoji: '??' },
  { id: 'apple', type: 'food', emoji: '??' },
  { id: 'grape', type: 'food', emoji: '??' },
  { id: 'fish', type: 'animal', emoji: '??' },
  { id: 'bird', type: 'animal', emoji: '??' },
  { id: 'cat', type: 'animal', emoji: '??' },
  { id: 'bolt', type: 'misc', emoji: '?' },
  { id: 'fire', type: 'misc', emoji: '??' },
  { id: 'snowflake', type: 'misc', emoji: '??' },
];

/**
 * Generate the board layout: which objects go in which cells.
 * Uses the seed to deterministically pick objects and positions.
 */
export function generateBoard(seed: number, config: StageConfig): GridPlacement[] {
  const rng = mulberry32(seed);
  const totalCells = config.gridSize * config.gridSize;
  const objectCount = Math.min(config.objectCount, totalCells, OBJECT_POOL.length);

  // Pick random objects from pool
  const shuffledObjects = seededShuffle(OBJECT_POOL, rng);
  const selectedObjects = shuffledObjects.slice(0, objectCount);

  // Pick random cell positions
  const allCells = Array.from({ length: totalCells }, (_, i) => i);
  const shuffledCells = seededShuffle(allCells, rng);
  const selectedCells = shuffledCells.slice(0, objectCount);

  // Create placements
  return selectedObjects.map((obj, idx) => ({
    cellIndex: selectedCells[idx],
    object: obj,
  }));
}

/**
 * Get just the objects from placements (for the tray, shuffled differently).
 */
export function getTrayObjects(placements: GridPlacement[], seed: number): ObjectItem[] {
  const rng = mulberry32(seed + 999); // Different seed offset for tray shuffle
  return seededShuffle(placements.map((p) => p.object), rng);
}

export { OBJECT_POOL };
