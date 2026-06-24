/**
 * Zubaco Platform — Shared Seeded PRNG System
 *
 * Uses Mulberry32 algorithm for fast, deterministic random number generation.
 * The seed derivation ensures provable fairness:
 *
 * 1. Platform generates serverSeed (random 32 bytes) on game start
 * 2. Platform gives client only sha256(serverSeed) BEFORE the game
 * 3. Client optionally provides clientSeed (for user-verified fairness)
 * 4. Final seed = sha256(serverSeed + clientSeed + nonce)
 * 5. After game: platform reveals serverSeed — user can verify the hash matches
 *
 * This proves the server couldn't have changed the seed after seeing the player's input.
 */

import * as crypto from 'crypto';

/**
 * Compute the final deterministic seed from server seed, client seed, and nonce.
 * Both sides (server + client) can compute this independently to verify fairness.
 */
export function computeFinalSeed(serverSeed: string, clientSeed: string = '', nonce: number = 0): number {
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = crypto.createHash('sha256').update(combined).digest();
  // Use first 4 bytes as a 32-bit unsigned integer
  return hash.readUInt32BE(0);
}

/**
 * Generate a cryptographically secure server seed.
 */
export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a server seed (given to client before game starts as commitment).
 */
export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Mulberry32 — Fast 32-bit seeded PRNG.
 * Produces deterministic sequences from a given seed.
 * All games MUST use this for procedural content generation.
 */
export function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return function () {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a seeded random number generator with convenience methods.
 */
export function createSeededRng(seed: number) {
  const next = mulberry32(seed);

  return {
    /** Returns a float in [0, 1) */
    random: next,

    /** Returns an integer in [min, max] (inclusive) */
    int(min: number, max: number): number {
      return Math.floor(next() * (max - min + 1)) + min;
    },

    /** Returns a boolean with given probability (default 0.5) */
    bool(probability = 0.5): boolean {
      return next() < probability;
    },

    /** Shuffle an array in-place (Fisher-Yates) */
    shuffle<T>(array: T[]): T[] {
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },

    /** Pick a random element from array */
    pick<T>(array: T[]): T {
      return array[Math.floor(next() * array.length)];
    },

    /** Pick N unique random elements from array */
    sample<T>(array: T[], n: number): T[] {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.slice(0, n);
    },
  };
}

/**
 * Verify that a revealed server seed matches the hash that was given before the game.
 * Used by clients to verify provable fairness after the game ends.
 */
export function verifyServerSeed(revealedSeed: string, commitmentHash: string): boolean {
  return hashServerSeed(revealedSeed) === commitmentHash;
}
