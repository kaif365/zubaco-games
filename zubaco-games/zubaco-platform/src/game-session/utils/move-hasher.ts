import { createHash } from 'crypto';

/**
 * Generates a deterministic hash of a game's move sequence.
 * Used for replay detection — if two sessions have the same moves_hash,
 * they submitted identical input sequences (likely replay/copy attack).
 *
 * @param moves - Raw input array from the game (clicks, swipes, placements, etc.)
 * @param serverSeed - The server seed committed at game start
 * @param nonce - Session nonce (prevents hash collision across sessions with same seed)
 */
export function generateMoveHash(moves: unknown[], serverSeed: string, nonce: number): string {
  const payload = JSON.stringify(moves) + '|' + serverSeed + '|' + nonce;
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Validates a moves_hash submitted by a game backend.
 * Returns true if the hash matches the expected format (64 hex chars).
 */
export function isValidMoveHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}
