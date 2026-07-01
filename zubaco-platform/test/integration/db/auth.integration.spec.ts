/**
 * SECTION A — AUTHENTICATION (DATABASE-BACKED integration, Phase T4-A)
 *
 * Real JWT issuance + refresh-token persistence (TokenService) and the OTP
 * generate/verify pipeline (OtpService) against a REAL PostgreSQL + Redis. The
 * only stubbed seam is the outbound SMS provider (external HTTP); the OTP itself
 * still flows through the real generate → bcrypt-hash → persist → verify path.
 */
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Harness, startHarness } from './harness';
import { createUser } from './prisma-test-util';

describe('Authentication — DB integration', () => {
  let h: Harness;

  beforeAll(async () => {
    h = await startHarness();
  });

  afterAll(async () => {
    await h.stop();
  });

  beforeEach(async () => {
    await h.reset();
  });

  describe('refresh token persistence & JWT', () => {
    it('issues a verifiable access token and persists a hashed refresh token', async () => {
      const { id } = await createUser(h.graph.prisma);

      const pair = await h.graph.token.generateTokenPair(id, 'device-1');
      expect(pair.accessToken).toBeTruthy();
      expect(pair.refreshToken).toBeTruthy();

      // Access token is a real, signed JWT resolving back to the subject.
      const claims = h.graph.token.verifyAccessToken(pair.accessToken);
      expect(claims?.sub).toBe(id);

      // The refresh token is stored HASHED, never in plaintext.
      const rows = await h.graph.prisma.refreshToken.findMany({ where: { user_id: id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].token_hash).not.toBe(pair.refreshToken);
      expect(rows[0].device_id).toBe('device-1');

      // The raw token verifies against the stored hash.
      const verified = await h.graph.token.verifyRefreshToken(pair.refreshToken);
      expect(verified?.userId).toBe(id);
    });

    it('rotates refresh tokens: old is revoked, new remains valid', async () => {
      const { id } = await createUser(h.graph.prisma);
      const first = await h.graph.token.generateTokenPair(id);

      // Rotate: issue a new pair and revoke the previous refresh token.
      const second = await h.graph.token.generateTokenPair(id);
      await h.graph.token.revokeRefreshToken(first.refreshToken);

      expect(await h.graph.token.verifyRefreshToken(first.refreshToken)).toBeNull();
      expect((await h.graph.token.verifyRefreshToken(second.refreshToken))?.userId).toBe(id);

      const remaining = await h.graph.prisma.refreshToken.count({ where: { user_id: id } });
      expect(remaining).toBe(1);
    });

    it('logout revokes a single refresh token', async () => {
      const { id } = await createUser(h.graph.prisma);
      const pair = await h.graph.token.generateTokenPair(id);

      await h.graph.token.revokeRefreshToken(pair.refreshToken);

      expect(await h.graph.token.verifyRefreshToken(pair.refreshToken)).toBeNull();
      expect(await h.graph.prisma.refreshToken.count({ where: { user_id: id } })).toBe(0);
    });

    it('session invalidation revokes ALL of a user\'s refresh tokens', async () => {
      const { id } = await createUser(h.graph.prisma);
      await h.graph.token.generateTokenPair(id, 'd1');
      await h.graph.token.generateTokenPair(id, 'd2');
      await h.graph.token.generateTokenPair(id, 'd3');
      expect(await h.graph.prisma.refreshToken.count({ where: { user_id: id } })).toBe(3);

      await h.graph.token.revokeAllUserTokens(id);

      expect(await h.graph.prisma.refreshToken.count({ where: { user_id: id } })).toBe(0);
    });

    it('does not verify an expired refresh token', async () => {
      const { id } = await createUser(h.graph.prisma);
      const raw = 'expired-raw-token';
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(raw).digest('hex');
      await h.graph.prisma.refreshToken.create({
        data: {
          user_id: id,
          token_hash: hash,
          expires_at: new Date(Date.now() - 1000), // already expired
        },
      });

      expect(await h.graph.token.verifyRefreshToken(raw)).toBeNull();
    });
  });

  describe('OTP generate & verify', () => {
    it('persists an OTP and verifies the real code end-to-end', async () => {
      const phone = '+919812345678';

      await h.graph.otp.generateAndSend(phone);

      // An OtpVerification row was persisted and the (stubbed) SMS was dispatched.
      const record = await h.graph.prisma.otpVerification.findFirst({ where: { phone } });
      expect(record).toBeTruthy();
      expect(record!.verified).toBe(false);
      expect(h.graph.smsSent).toHaveLength(1);

      // Recover the actual code from the outbound SMS text and verify it.
      const otp = h.graph.smsSent[0].message.match(/(\d{4,8})/)![1];
      const ok = await h.graph.otp.verify(phone, otp);
      expect(ok).toBe(true);

      const after = await h.graph.prisma.otpVerification.findUnique({ where: { id: record!.id } });
      expect(after!.verified).toBe(true);
    });

    it('rejects a wrong OTP and increments the attempt counter', async () => {
      const phone = '+919800000001';
      const otpHash = await bcrypt.hash('123456', 10);
      const record = await h.graph.prisma.otpVerification.create({
        data: { phone, otp_hash: otpHash, expires_at: new Date(Date.now() + 300000) },
      });

      const ok = await h.graph.otp.verify(phone, '000000');
      expect(ok).toBe(false);

      const after = await h.graph.prisma.otpVerification.findUnique({ where: { id: record.id } });
      expect(after!.attempts).toBe(1);
      expect(after!.verified).toBe(false);
    });

    it('does not verify an expired OTP', async () => {
      const phone = '+919800000002';
      const otpHash = await bcrypt.hash('123456', 10);
      await h.graph.prisma.otpVerification.create({
        data: { phone, otp_hash: otpHash, expires_at: new Date(Date.now() - 1000) },
      });

      expect(await h.graph.otp.verify(phone, '123456')).toBe(false);
    });

    it('rate-limits OTP requests (max 5 per phone per hour)', async () => {
      const phone = '+919700000000';
      for (let i = 0; i < 5; i++) {
        await h.graph.otp.generateAndSend(phone);
      }
      await expect(h.graph.otp.generateAndSend(phone)).rejects.toBeInstanceOf(BadRequestException);

      // Only the 5 permitted OTPs were persisted; the 6th was blocked pre-write.
      const count = await h.graph.prisma.otpVerification.count({ where: { phone } });
      expect(count).toBe(5);
    });
  });
});
