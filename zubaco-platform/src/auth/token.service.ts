import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { config } from '../config';
import * as crypto from 'crypto';

export interface StoredTokenData {
  userId: string;
  familyId: string;
  isUsed: boolean;
  deviceId?: string | null;
  createdAt: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async generateTokenPair(userId: string, deviceId?: string, existingFamilyId?: string) {
    const familyId = existingFamilyId || crypto.randomUUID();

    const accessToken = this.jwt.sign(
      { sub: userId, type: 'access' },
      { secret: config.jwt.accessSecret, expiresIn: '15m' },
    );

    const refreshTokenRaw = crypto.randomUUID();
    const tokenHash = this.hashToken(refreshTokenRaw);
    const ttlSeconds = 7 * 24 * 3600; // 7 days

    const tokenData: StoredTokenData = {
      userId,
      familyId,
      isUsed: false,
      deviceId: deviceId || null,
      createdAt: Date.now(),
    };

    // Store token in Redis
    await this.redis.set(`rt:${tokenHash}`, JSON.stringify(tokenData), ttlSeconds);

    // Track token within its family set
    await this.redis.sadd(`rt_family:${familyId}`, tokenHash);
    await this.redis.expire(`rt_family:${familyId}`, ttlSeconds);

    // Track family for this user
    await this.redis.sadd(`user_families:${userId}`, familyId);
    await this.redis.expire(`user_families:${userId}`, ttlSeconds);

    // Store in DB for durability / audit
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
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
      familyId,
      userId,
    };
  }

  async rotateRefreshToken(token: string) {
    const tokenHash = this.hashToken(token);

    // 1. Look up token in Redis
    let tokenData: StoredTokenData | null = null;
    const cachedStr = await this.redis.get(`rt:${tokenHash}`);
    if (cachedStr) {
      tokenData = JSON.parse(cachedStr);
    } else {
      // Fallback check in DB
      const stored = await this.prisma.refreshToken.findFirst({
        where: {
          token_hash: tokenHash,
          expires_at: { gt: new Date() },
        },
      });
      if (stored) {
        tokenData = {
          userId: stored.user_id,
          familyId: crypto.randomUUID(), // Fallback legacy family
          isUsed: false,
          deviceId: stored.device_id,
          createdAt: stored.created_at.getTime(),
        };
      }
    }

    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Check if family was already revoked
    const isFamilyRevoked = await this.redis.get(`rt_family_revoked:${tokenData.familyId}`);
    if (isFamilyRevoked) {
      throw new UnauthorizedException('Refresh token family has been revoked');
    }

    // 3. REUSE DETECTION: If token was already used, an attacker has replayed an old token!
    if (tokenData.isUsed) {
      // Invalidate the ENTIRE token family immediately
      await this.revokeFamily(tokenData.familyId, tokenData.userId);
      throw new UnauthorizedException(
        'Refresh token reuse detected. All tokens in this family have been revoked.',
      );
    }

    // 4. Mark old token as used in Redis (prevents replay attack)
    tokenData.isUsed = true;
    await this.redis.set(`rt:${tokenHash}`, JSON.stringify(tokenData), 7 * 24 * 3600);

    // Delete old token from active DB tokens
    await this.prisma.refreshToken.deleteMany({
      where: { token_hash: tokenHash },
    });

    // 5. Mint new token pair with the SAME familyId
    return await this.generateTokenPair(
      tokenData.userId,
      tokenData.deviceId || undefined,
      tokenData.familyId,
    );
  }

  async verifyRefreshToken(token: string): Promise<{ userId: string; familyId?: string } | null> {
    const tokenHash = this.hashToken(token);

    const cachedStr = await this.redis.get(`rt:${tokenHash}`);
    if (cachedStr) {
      const data: StoredTokenData = JSON.parse(cachedStr);
      if (data.isUsed) return null;
      return { userId: data.userId, familyId: data.familyId };
    }

    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        token_hash: tokenHash,
        expires_at: { gt: new Date() },
      },
    });

    if (!stored) return null;
    return { userId: stored.user_id };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    const cachedStr = await this.redis.get(`rt:${tokenHash}`);
    if (cachedStr) {
      const data: StoredTokenData = JSON.parse(cachedStr);
      await this.revokeFamily(data.familyId, data.userId);
    }

    await this.prisma.refreshToken.deleteMany({
      where: { token_hash: tokenHash },
    });
  }

  async revokeFamily(familyId: string, userId?: string): Promise<void> {
    // Mark family revoked in Redis
    await this.redis.set(`rt_family_revoked:${familyId}`, '1', 7 * 24 * 3600);

    // Revoke all tokens belonging to this family
    const hashes = await this.redis.smembers(`rt_family:${familyId}`);
    for (const hash of hashes) {
      await this.redis.del(`rt:${hash}`);
    }
    await this.redis.del(`rt_family:${familyId}`);

    if (userId) {
      await this.redis.srem(`user_families:${userId}`, familyId);
      await this.prisma.refreshToken.deleteMany({ where: { user_id: userId } });
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const families = await this.redis.smembers(`user_families:${userId}`);
    for (const familyId of families) {
      await this.revokeFamily(familyId);
    }
    await this.redis.del(`user_families:${userId}`);
    await this.prisma.refreshToken.deleteMany({ where: { user_id: userId } });
  }

  verifyAccessToken(token: string): { sub: string } | null {
    try {
      return this.jwt.verify(token, { secret: config.jwt.accessSecret });
    } catch {
      return null;
    }
  }
}

