import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    private readonly googleStrategy: GoogleStrategy,
    private readonly appleStrategy: AppleStrategy,
  ) {}

  // ─── PHONE OTP FLOW ───────────────────────────────────────────

  async sendOtp(phone: string): Promise<{ message: string }> {
    await this.otpService.generateAndSend(phone);
    return { message: 'OTP sent successfully' };
  }

  async verifyOtpAndLogin(phone: string, otp: string, deviceId?: string) {
    const isValid = await this.otpService.verify(phone, otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      // Auto-register on first OTP verification
      user = await this.prisma.user.create({
        data: {
          phone,
          is_verified: true,
          auth_providers: {
            create: { provider: 'PHONE', provider_id: phone },
          },
        },
      });
    } else if (!user.is_verified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { is_verified: true },
      });
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const tokens = await this.tokenService.generateTokenPair(user.id, deviceId);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ─── GOOGLE OAUTH FLOW ────────────────────────────────────────

  async googleLoginWithToken(idToken: string) {
    // Verify the ID token server-side (prevents forged identity)
    const googleProfile = await this.googleStrategy.verifyToken(idToken);
    return this.googleLogin(googleProfile);
  }

  async googleLogin(googleProfile: { id: string; email: string; name: string; picture?: string }) {
    const existing = await this.prisma.authProvider.findUnique({
      where: { provider_provider_id: { provider: 'GOOGLE', provider_id: googleProfile.id } },
      include: { user: true },
    });

    if (existing) {
      await this.prisma.user.update({
        where: { id: existing.user.id },
        data: { last_login_at: new Date() },
      });
      const tokens = await this.tokenService.generateTokenPair(existing.user.id);
      return { user: this.sanitizeUser(existing.user), ...tokens };
    }

    // Check if email already exists (link accounts)
    let user = await this.prisma.user.findUnique({ where: { email: googleProfile.email } });

    if (user) {
      // Link Google to existing account
      await this.prisma.authProvider.create({
        data: {
          user_id: user.id,
          provider: 'GOOGLE',
          provider_id: googleProfile.id,
          provider_email: googleProfile.email,
        },
      });
    } else {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          email: googleProfile.email,
          display_name: googleProfile.name,
          avatar_url: googleProfile.picture,
          is_verified: true,
          auth_providers: {
            create: {
              provider: 'GOOGLE',
              provider_id: googleProfile.id,
              provider_email: googleProfile.email,
            },
          },
        },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const tokens = await this.tokenService.generateTokenPair(user.id);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ─── APPLE OAUTH FLOW ─────────────────────────────────────────

  async appleLoginWithToken(identityToken: string, clientName?: string) {
    // Verify the identity token server-side (prevents forged Apple ID)
    const appleProfile = await this.appleStrategy.verifyToken(identityToken);
    // Apple only sends name on first auth; use client-provided name as fallback
    if (clientName && !appleProfile.name) {
      appleProfile.name = clientName;
    }
    return this.appleLogin(appleProfile);
  }

  async appleLogin(appleProfile: { id: string; email?: string; name?: string }) {
    const existing = await this.prisma.authProvider.findUnique({
      where: { provider_provider_id: { provider: 'APPLE', provider_id: appleProfile.id } },
      include: { user: true },
    });

    if (existing) {
      await this.prisma.user.update({
        where: { id: existing.user.id },
        data: { last_login_at: new Date() },
      });
      const tokens = await this.tokenService.generateTokenPair(existing.user.id);
      return { user: this.sanitizeUser(existing.user), ...tokens };
    }

    // Create new user
    const user = await this.prisma.user.create({
      data: {
        email: appleProfile.email,
        display_name: appleProfile.name,
        is_verified: true,
        auth_providers: {
          create: {
            provider: 'APPLE',
            provider_id: appleProfile.id,
            provider_email: appleProfile.email,
          },
        },
      },
    });

    const tokens = await this.tokenService.generateTokenPair(user.id);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ─── TOKEN REFRESH ─────────────────────────────────────────────

  async refreshTokens(refreshToken: string) {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Invalidate old refresh token (rotation)
    await this.tokenService.revokeRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.is_banned) {
      throw new UnauthorizedException('Account suspended');
    }

    const tokens = await this.tokenService.generateTokenPair(user.id);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ─── LOGOUT ────────────────────────────────────────────────────

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);
  }

  // ─── HELPERS ───────────────────────────────────────────────────

  private sanitizeUser(user: any) {
    const { deleted_at, ...safe } = user;
    return safe;
  }

  // ─── ACCOUNT LINKING ───────────────────────────────────────────

  async linkAccount(
    userId: string,
    dto: { provider: 'google' | 'apple' | 'phone'; provider_id?: string; phone?: string; email?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    if (dto.provider === 'google') {
      if (!dto.provider_id) throw new ConflictException('Google ID required');
      const existing = await this.prisma.user.findFirst({ where: { google_id: dto.provider_id, id: { not: userId } } });
      if (existing) throw new ConflictException('This Google account is already linked to another user');
      await this.prisma.user.update({ where: { id: userId }, data: { google_id: dto.provider_id, email: dto.email || user.email } });
    } else if (dto.provider === 'apple') {
      if (!dto.provider_id) throw new ConflictException('Apple ID required');
      const existing = await this.prisma.user.findFirst({ where: { apple_id: dto.provider_id, id: { not: userId } } });
      if (existing) throw new ConflictException('This Apple account is already linked to another user');
      await this.prisma.user.update({ where: { id: userId }, data: { apple_id: dto.provider_id, email: dto.email || user.email } });
    } else if (dto.provider === 'phone') {
      if (!dto.phone) throw new ConflictException('Phone number required');
      const existing = await this.prisma.user.findFirst({ where: { phone: dto.phone, id: { not: userId } } });
      if (existing) throw new ConflictException('This phone number is already linked to another user');
      await this.prisma.user.update({ where: { id: userId }, data: { phone: dto.phone } });
    }

    return { message: `${dto.provider} account linked successfully` };
  }
}
