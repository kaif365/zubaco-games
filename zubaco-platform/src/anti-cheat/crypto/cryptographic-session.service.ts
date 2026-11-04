import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { config } from '../../config';
import { RedisService } from '../../common/redis/redis.service';

/**
 * Provably Fair Cryptographic Session Service (Module 7.1).
 *
 * Enforces cryptographic fairness, HMAC match tickets, single-use anti-replay locks,
 * and deterministic seed commitment verification.
 */
@Injectable()
export class CryptographicSessionService {
  private readonly secretKey: string;

  constructor(private readonly redis: RedisService) {
    this.secretKey = process.env.MATCH_SIGNING_SECRET || config.jwt.accessSecret;
  }

  /**
   * Generates a 256-bit cryptographically secure server seed and its SHA-256 commitment hash.
   * The hash is sent to the client BEFORE the match starts; the actual seed is revealed only after.
   */
  generateServerSeed(): { serverSeed: string; serverSeedHash: string } {
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    return { serverSeed, serverSeedHash };
  }

  /**
   * Constant-time verification that an unveiled server seed matches the pre-game committed SHA-256 hash.
   */
  verifyServerSeedCommitment(serverSeed: string, committedHash: string): boolean {
    if (!serverSeed || !committedHash || typeof serverSeed !== 'string' || typeof committedHash !== 'string') {
      return false;
    }
    const computedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const bufA = Buffer.from(computedHash, 'utf8');
    const bufB = Buffer.from(committedHash, 'utf8');

    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Issues an authoritative HMAC-SHA256 match ticket binding session parameters.
   */
  issueMatchTicket(
    sessionId: string,
    userId: string,
    gameType: string,
    serverSeedHash: string,
    nonce: number,
  ): string {
    const payload = `${sessionId}:${userId}:${gameType}:${serverSeedHash}:${nonce}`;
    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
  }

  /**
   * Validates match ticket authenticity using constant-time comparison to prevent timing attacks.
   */
  verifyMatchTicket(
    ticket: string,
    sessionId: string,
    userId: string,
    gameType: string,
    serverSeedHash: string,
    nonce: number,
  ): boolean {
    if (!ticket || typeof ticket !== 'string') return false;

    const expectedTicket = this.issueMatchTicket(sessionId, userId, gameType, serverSeedHash, nonce);
    const bufA = Buffer.from(ticket, 'utf8');
    const bufB = Buffer.from(expectedTicket, 'utf8');

    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Single-use session lock to prevent replay attacks on score submission.
   * Returns true if lock was acquired (first submission), false if duplicate/replayed.
   */
  async acquireSingleUseLock(sessionId: string, ttlSeconds = 3600): Promise<boolean> {
    const lockKey = `match:replay:${sessionId}`;
    const acquired = await this.redis.setnx(lockKey, '1');
    if (!acquired) {
      return false;
    }
    await this.redis.expire(lockKey, ttlSeconds);
    return true;
  }

  /**
   * Enforces single-use idempotency, throwing BadRequestException if already completed/submitted.
   */
  async enforceSingleUse(sessionId: string): Promise<void> {
    const fresh = await this.acquireSingleUseLock(sessionId);
    if (!fresh) {
      throw new BadRequestException('Session replay detected: Match completion already submitted');
    }
  }

  /**
   * Deterministic pseudo-random float generator [0, 1) derived from HMAC-SHA256(serverSeed, clientSeed + ':' + nonce).
   * Proves that all puzzle generation and board configurations are deterministic and un-rigged.
   */
  deterministicRoll(serverSeed: string, clientSeed: string, nonce: number): number {
    const hmac = crypto
      .createHmac('sha256', serverSeed)
      .update(`${clientSeed}:${nonce}`)
      .digest('hex');

    // Take first 8 hex chars (32 bits) and divide by 2^32
    const intVal = parseInt(hmac.substring(0, 8), 16);
    return intVal / 0x100000000;
  }
}
