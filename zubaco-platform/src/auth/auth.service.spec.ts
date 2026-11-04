jest.mock('jwks-rsa', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getSigningKey: jest.fn(),
  })),
}));

import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { AppleStrategy } from './strategies/apple.strategy';

describe('AuthService (Authentication & Session Lifecycle)', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockOtpService: any;
  let mockTokenService: any;
  let mockGoogleStrategy: any;
  let mockAppleStrategy: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      authProvider: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    mockOtpService = {
      normalizePhone: jest.fn((p: string) => (p.startsWith('+91') ? p : `+91${p.replace(/\D/g, '')}`)),
      generateAndSend: jest.fn().mockResolvedValue(undefined),
      verify: jest.fn(),
    };

    mockTokenService = {
      generateTokenPair: jest.fn().mockResolvedValue({
        accessToken: 'mock-access-jwt',
        refreshToken: 'mock-refresh-uuid',
        expiresIn: '15m',
        familyId: 'family-1',
        userId: 'user-1',
      }),
      rotateRefreshToken: jest.fn(),
      revokeFamily: jest.fn().mockResolvedValue(undefined),
      revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
      revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
    };

    mockGoogleStrategy = {
      verifyToken: jest.fn(),
    };

    mockAppleStrategy = {
      verifyToken: jest.fn(),
    };

    authService = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockOtpService as unknown as OtpService,
      mockTokenService as unknown as TokenService,
      mockGoogleStrategy as unknown as GoogleStrategy,
      mockAppleStrategy as unknown as AppleStrategy,
    );
  });

  describe('Phone OTP Authentication & Auto-Registration', () => {
    it('normalizes phone number and sends OTP', async () => {
      const res = await authService.sendOtp('9876543210');
      expect(res).toEqual({ message: 'OTP sent successfully' });
      expect(mockOtpService.normalizePhone).toHaveBeenCalledWith('9876543210');
      expect(mockOtpService.generateAndSend).toHaveBeenCalledWith('+919876543210');
    });

    it('rejects invalid OTP with UnauthorizedException', async () => {
      mockOtpService.verify.mockResolvedValue(false);

      await expect(authService.verifyOtpAndLogin('9876543210', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('auto-registers user on first valid OTP verification', async () => {
      mockOtpService.verify.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-1',
        phone: '+919876543210',
        is_verified: true,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'new-user-1',
        phone: '+919876543210',
        is_verified: true,
        last_login_at: new Date(),
      });

      const res = await authService.verifyOtpAndLogin('9876543210', '123456');

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: '+919876543210',
            is_verified: true,
          }),
        }),
      );
      expect(res.accessToken).toBe('mock-access-jwt');
      expect(res.user.phone).toBe('+919876543210');
    });
  });

  describe('Refresh Token Rotation & Invalidation', () => {
    it('rotates refresh tokens for active user', async () => {
      mockTokenService.rotateRefreshToken.mockResolvedValue({
        accessToken: 'new-access-jwt',
        refreshToken: 'new-refresh-uuid',
        expiresIn: '15m',
        familyId: 'family-1',
        userId: 'user-1',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+919876543210',
        is_banned: false,
      });

      const res = await authService.refreshTokens('old-refresh-uuid');
      expect(res.accessToken).toBe('new-access-jwt');
      expect(res.refreshToken).toBe('new-refresh-uuid');
    });

    it('rejects rotation and revokes family if user is banned', async () => {
      mockTokenService.rotateRefreshToken.mockResolvedValue({
        accessToken: 'new-access-jwt',
        refreshToken: 'new-refresh-uuid',
        expiresIn: '15m',
        familyId: 'family-1',
        userId: 'banned-user',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'banned-user',
        is_banned: true,
      });

      await expect(authService.refreshTokens('old-refresh-uuid')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockTokenService.revokeFamily).toHaveBeenCalledWith('family-1', 'banned-user');
    });
  });

  describe('Account Linking', () => {
    it('normalizes phone number and links to account if not in conflict', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1', phone: '+919876543210' });

      const res = await authService.linkAccount('user-1', {
        provider: 'phone',
        phone: '9876543210',
      });
      expect(res).toEqual({ message: 'phone account linked successfully' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { phone: '+919876543210' },
      });
    });

    it('throws ConflictException if phone number is already linked to another account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-2' });

      await expect(
        authService.linkAccount('user-1', {
          provider: 'phone',
          phone: '9876543210',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
