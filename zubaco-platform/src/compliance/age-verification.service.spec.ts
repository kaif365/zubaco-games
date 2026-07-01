import { BadRequestException } from '@nestjs/common';
import { AgeVerificationService } from './age-verification.service';

/**
 * Unit tests for AgeVerificationService — the 18+ gate for paid features.
 * Prisma is mocked; we focus on the age boundary (exactly 18, birthday not yet
 * reached) and the verification gate.
 */
describe('AgeVerificationService', () => {
  let service: AgeVerificationService;
  let prisma: { user: { update: jest.Mock; findUnique: jest.Mock } };

  const dobYearsAgo = (years: number, dayOffset = 0): Date => {
    const t = new Date();
    return new Date(t.getFullYear() - years, t.getMonth(), t.getDate() + dayOffset);
  };

  beforeEach(() => {
    prisma = { user: { update: jest.fn(), findUnique: jest.fn() } };
    service = new AgeVerificationService(prisma as any);
  });

  describe('verifyAge', () => {
    it('rejects a clearly under-age user without touching the database', async () => {
      await expect(service.verifyAge('u1', dobYearsAgo(10))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('accepts a user turning exactly 18 today (boundary)', async () => {
      prisma.user.update.mockResolvedValue({});
      const r = await service.verifyAge('u1', dobYearsAgo(18));
      expect(r).toEqual({ verified: true });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({ age_verified: true }),
        }),
      );
    });

    it('rejects a user whose 18th birthday is one day away', async () => {
      await expect(service.verifyAge('u1', dobYearsAgo(18, 1))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('accepts a clearly adult user', async () => {
      prisma.user.update.mockResolvedValue({});
      await expect(service.verifyAge('u1', dobYearsAgo(30))).resolves.toEqual({ verified: true });
    });
  });

  describe('ensureAgeVerified', () => {
    it('passes when the user is already verified', async () => {
      prisma.user.findUnique.mockResolvedValue({ age_verified: true });
      await expect(service.ensureAgeVerified('u1')).resolves.toBeUndefined();
    });

    it('throws when the user is not verified', async () => {
      prisma.user.findUnique.mockResolvedValue({ age_verified: false });
      await expect(service.ensureAgeVerified('u1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when the user record does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.ensureAgeVerified('u1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
