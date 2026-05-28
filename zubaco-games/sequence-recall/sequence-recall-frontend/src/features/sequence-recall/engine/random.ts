import type { TileId } from '@/types/game';

export type Rng = () => number;

/**
 * Random tile id.
 *
 * @param {number} boxCount - The box count.
 * @param {() => number} rng - The rng.
 *
 * @returns {number} The result of randomTileId.
 */
export function randomTileId(boxCount: number = 4, rng: Rng = Math.random): TileId {
  return Math.floor(rng() * boxCount) + 1;
}
