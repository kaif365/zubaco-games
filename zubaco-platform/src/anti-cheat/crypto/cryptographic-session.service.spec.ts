import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { CryptographicSessionService } from './cryptographic-session.service';

describe('CryptographicSessionService - Provably Fair Seeds & Replay Protection (Module 7.1)', () => {
  let service: CryptographicSessionService;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      setnx: jest.fn(),
      expire: jest.fn(),
    };

    service = new CryptographicSessionService(mockRedis);
  });

  describe('Server Seed Commitment (Provable Fairness)', () => {
    it('should generate a 256-bit hex server seed and matching SHA-256 commitment hash', () => {
      const { serverSeed, serverSeedHash } = service.generateServerSeed();

      expect(serverSeed).toHaveLength(64); // 32 bytes in hex = 64 chars
      expect(serverSeedHash).toHaveLength(64);

      const expectedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
      expect(serverSeedHash).toBe(expectedHash);
    });

    it('should verify matching server seed commitment', () => {
      const { serverSeed, serverSeedHash } = service.generateServerSeed();

      const isValid = service.verifyServerSeedCommitment(serverSeed, serverSeedHash);
      expect(isValid).toBe(true);
    });

    it('should reject tampered or mismatched server seed', () => {
      const { serverSeed, serverSeedHash } = service.generateServerSeed();
      const fakeSeed = crypto.randomBytes(32).toString('hex');

      const isValid = service.verifyServerSeedCommitment(fakeSeed, serverSeedHash);
      expect(isValid).toBe(false);
    });

    it('should return false for empty or non-string inputs safely', () => {
      expect(service.verifyServerSeedCommitment('', '')).toBe(false);
      expect(service.verifyServerSeedCommitment(null as any, 'some-hash')).toBe(false);
    });
  });

  describe('HMAC Match Ticket Issuance & Verification', () => {
    const sessionId = 'session-uuid-123';
    const userId = 'user-uuid-456';
    const gameType = 'ARROWS';
    const serverSeedHash = 'committed-hash-789';
    const nonce = 1;

    it('should issue a valid HMAC-SHA256 match ticket', () => {
      const ticket = service.issueMatchTicket(sessionId, userId, gameType, serverSeedHash, nonce);

      expect(ticket).toHaveLength(64);
      const verified = service.verifyMatchTicket(ticket, sessionId, userId, gameType, serverSeedHash, nonce);
      expect(verified).toBe(true);
    });

    it('should reject match ticket if session parameters are tampered', () => {
      const ticket = service.issueMatchTicket(sessionId, userId, gameType, serverSeedHash, nonce);

      // Wrong user
      expect(service.verifyMatchTicket(ticket, sessionId, 'attacker-user', gameType, serverSeedHash, nonce)).toBe(false);
      // Wrong game type
      expect(service.verifyMatchTicket(ticket, sessionId, userId, 'SUDOKU', serverSeedHash, nonce)).toBe(false);
      // Wrong nonce
      expect(service.verifyMatchTicket(ticket, sessionId, userId, gameType, serverSeedHash, 2)).toBe(false);
      // Tampered ticket string
      expect(service.verifyMatchTicket('tampered-ticket-hex', sessionId, userId, gameType, serverSeedHash, nonce)).toBe(false);
    });
  });

  describe('Single-Use Anti-Replay Guard (Redis SETNX)', () => {
    it('should acquire lock on first submission and set 1-hour expiration', async () => {
      mockRedis.setnx.mockResolvedValue(true);
      mockRedis.expire.mockResolvedValue(true);

      const acquired = await service.acquireSingleUseLock('session-first-try', 3600);

      expect(acquired).toBe(true);
      expect(mockRedis.setnx).toHaveBeenCalledWith('match:replay:session-first-try', '1');
      expect(mockRedis.expire).toHaveBeenCalledWith('match:replay:session-first-try', 3600);
    });

    it('should reject replay submission when lock already exists', async () => {
      mockRedis.setnx.mockResolvedValue(false);

      const acquired = await service.acquireSingleUseLock('session-replayed', 3600);

      expect(acquired).toBe(false);
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when enforcing single-use on a replay attempt', async () => {
      mockRedis.setnx.mockResolvedValue(false);

      await expect(service.enforceSingleUse('session-replay-attack')).rejects.toThrow(BadRequestException);
    });
  });

  describe('Deterministic Provably Fair RNG Roll', () => {
    it('should produce identical deterministic rolls in [0, 1) for the same inputs', () => {
      const serverSeed = 'seed-alpha-123';
      const clientSeed = 'seed-beta-456';
      const nonce = 5;

      const roll1 = service.deterministicRoll(serverSeed, clientSeed, nonce);
      const roll2 = service.deterministicRoll(serverSeed, clientSeed, nonce);

      expect(roll1).toBe(roll2);
      expect(roll1).toBeGreaterThanOrEqual(0);
      expect(roll1).toBeLessThan(1);
    });

    it('should produce different rolls when nonce increments', () => {
      const serverSeed = 'seed-alpha-123';
      const clientSeed = 'seed-beta-456';

      const rollNonce1 = service.deterministicRoll(serverSeed, clientSeed, 1);
      const rollNonce2 = service.deterministicRoll(serverSeed, clientSeed, 2);

      expect(rollNonce1).not.toBe(rollNonce2);
    });
  });
});
