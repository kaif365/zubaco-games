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
      { secret: config.jwt.accessSecret, expiresIn: '15m' },
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

  async verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
    const tokenHash = this.hashToken(token);

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

    await this.prisma.refreshToken.deleteMany({
      where: { token_hash: tokenHash },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
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
