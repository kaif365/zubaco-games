import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { config } from '../config';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async generateTokenPair(userId: string, deviceId?: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, type: 'access' },
      { secret: config.jwt.accessSecret, expiresIn: config.jwt.accessExpiry as import('ms').StringValue, algorithm: 'HS256' },
    );

    const refreshTokenRaw = uuidv4();
    const tokenHash = this.hashToken(refreshTokenRaw);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        device_id: deviceId,
        expires_at: expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      expiresIn: config.jwt.accessExpiry,
    };
  }

  /**
   * Atomically consume (rotate) a refresh token.
   * The delete on the unique `token_hash` is a single row-level operation, so two
   * concurrent refresh attempts with the same token cannot both succeed — exactly one
   * deletion wins, the other resolves to "not found". This provides single-use semantics
   * and prevents refresh-token replay / race-based double minting.
   * Returns the owning user + device on success, or null if the token is unknown,
   * already consumed, or expired.
   */
  async consumeRefreshToken(token: string): Promise<{ userId: string; deviceId?: string } | null> {
    const tokenHash = this.hashToken(token);

    let deleted: { user_id: string; device_id: string | null; expires_at: Date };
    try {
      deleted = await this.prisma.refreshToken.delete({
        where: { token_hash: tokenHash },
        select: { user_id: true, device_id: true, expires_at: true },
      });
    } catch {
      // P2025 — record not found (unknown or already consumed by a concurrent request)
      return null;
    }

    if (deleted.expires_at <= new Date()) {
      return null;
    }

    return { userId: deleted.user_id, deviceId: deleted.device_id ?? undefined };
  }

  /**
   * Revoke a single refresh token belonging to the given user.
   * The `user_id` predicate enforces ownership so a caller cannot revoke another
   * user's session even if they somehow learn its token value.
   */
  async revokeRefreshToken(userId: string, token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    await this.prisma.refreshToken.deleteMany({
      where: { token_hash: tokenHash, user_id: userId },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { user_id: userId } });
  }

  verifyAccessToken(token: string): { sub: string } | null {
    try {
      const payload = this.jwt.verify<{ sub: string; type?: string }>(token, {
        secret: config.jwt.accessSecret,
        algorithms: ['HS256'],
      });
      if (payload.type !== 'access') return null;
      return { sub: payload.sub };
    } catch {
      return null;
    }
  }
}
