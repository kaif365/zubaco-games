import { randomTileId, type Rng } from '@/features/sequence-recall/engine/random';
import type { TileId } from '@/types/game';

/**
 * Generates sequence.
 *
 * @param {number} length - The length.
 * @param {number} boxCount - The box count.
 * @param {Rng | undefined} rng - The rng.
 *
 * @returns {number[]} The result of generateSequence.
 */
export function generateSequence(length: number, boxCount: number = 4, rng?: Rng): TileId[] {
  const sequence: TileId[] = [];
  let prev: TileId | null = null;
  let prevPrev: TileId | null = null;

  while (sequence.length < length) {
    const next = randomTileId(boxCount, rng);
    if (next !== prev || next !== prevPrev) {
      sequence.push(next);
      prevPrev = prev;
      prev = next;
    }
  }

  return sequence;
}

/**
 * Checks whether move correct.
 *
 * @param {number[]} sequence - The sequence.
 * @param {number[]} userInput - The user input.
 * @param {number} tile - The tile.
 *
 * @returns {boolean} The result of isMoveCorrect.
 */
export function isMoveCorrect(sequence: TileId[], userInput: TileId[], tile: TileId): boolean {
  return sequence[userInput.length] === tile;
}
