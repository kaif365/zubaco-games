import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * A deterministic, dependency-free pseudo-random number generator.
 *
 * This is the server-side equivalent of seedrandom.js mandated by the Shunya
 * NFR: "for a given seed, all game state and scoring must be identical." The
 * generator is seeded from a SHA-256 digest of the dual-seed material
 * (server_seed + client_seed + nonce) so the same inputs always reproduce the
 * same stream — enabling server-side board generation and replay validation.
 *
 * Algorithm: SHA-256 → 4×32-bit lanes → xoshiro128** core. Fast, well-distributed,
 * and fully reproducible across Node versions (no platform-specific Math.random).
 */
export class DeterministicRng {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(seedMaterial: string) {
    const digest = crypto.createHash('sha256').update(seedMaterial).digest();
    this.s0 = digest.readUInt32LE(0) || 1;
    this.s1 = digest.readUInt32LE(4) || 2;
    this.s2 = digest.readUInt32LE(8) || 3;
    this.s3 = digest.readUInt32LE(12) || 4;
    // Warm up the state to avoid early correlation.
    for (let i = 0; i < 16; i++) this.nextUint32();
  }

  private rotl(x: number, k: number): number {
    return ((x << k) | (x >>> (32 - k))) >>> 0;
  }

  /** Next unsigned 32-bit integer. */
  nextUint32(): number {
    const result = (this.rotl((Math.imul(this.s1, 5) >>> 0), 7) * 9) >>> 0;
    const t = (this.s1 << 9) >>> 0;
    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;
    this.s2 ^= t;
    this.s3 = this.rotl(this.s3, 11);
    return result >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    return this.nextUint32() / 0x100000000;
  }

  /** Integer in [min, max] inclusive. */
  intBetween(min: number, max: number): number {
    if (max <= min) return min;
    return min + (this.nextUint32() % (max - min + 1));
  }

  /** In-place Fisher–Yates shuffle driven by this stream. */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextUint32() % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Pick a random element. */
  pick<T>(arr: T[]): T {
    return arr[this.nextUint32() % arr.length];
  }
}

/**
 * Factory + helpers for creating deterministic RNGs from session seed material.
 */
@Injectable()
export class DeterministicRngService {
  /**
   * Build the canonical seed string for a session. The user_input_hash binds the
   * stream to the specific player's interaction so two players can never share a
   * pre-computed board, satisfying the anti pre-calculation requirement.
   */
  buildSeedMaterial(serverSeed: string, clientSeed?: string | null, nonce = 0, userInputHash?: string): string {
    return [serverSeed, clientSeed ?? '', String(nonce), userInputHash ?? ''].join('::');
  }

  /** Create a deterministic RNG for a session. */
  create(serverSeed: string, clientSeed?: string | null, nonce = 0, userInputHash?: string): DeterministicRng {
    return new DeterministicRng(this.buildSeedMaterial(serverSeed, clientSeed, nonce, userInputHash));
  }

  /**
   * Stable fingerprint of an arbitrary game board/state. Used to prove the
   * client played the exact board the server generated (anti-tamper) and to
   * cheaply compare reconstructed vs submitted state.
   */
  fingerprint(value: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32);
  }
}
