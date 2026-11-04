import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GeoFencingGuard, isStateBanned } from './geo-fencing.guard';
import { PrismaService } from '../common/prisma/prisma.service';

describe('GeoFencingGuard (Indian State Restrictions)', () => {
  let guard: GeoFencingGuard;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    guard = new GeoFencingGuard(mockPrisma as unknown as PrismaService);
  });

  const createMockContext = (user: any, headers: Record<string, string> = {}, body: any = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          headers,
          body,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  describe('isStateBanned utility', () => {
    it('identifies banned states by 2-letter ISO code', () => {
      expect(isStateBanned('AS')).toBe(true); // Assam
      expect(isStateBanned('OD')).toBe(true); // Odisha
      expect(isStateBanned('OR')).toBe(true); // Orissa
      expect(isStateBanned('TS')).toBe(true); // Telangana (official)
      expect(isStateBanned('TG')).toBe(true); // Telangana (colloquial)
      expect(isStateBanned('AP')).toBe(true); // Andhra Pradesh
      expect(isStateBanned('SK')).toBe(true); // Sikkim
      expect(isStateBanned('NL')).toBe(true); // Nagaland
      expect(isStateBanned('AR')).toBe(true); // Arunachal Pradesh
      expect(isStateBanned('MG')).toBe(true); // Meghalaya
    });

    it('identifies banned states by full state name (case-insensitive)', () => {
      expect(isStateBanned('Assam')).toBe(true);
      expect(isStateBanned('telangana')).toBe(true);
      expect(isStateBanned('Odisha')).toBe(true);
      expect(isStateBanned('Andhra Pradesh')).toBe(true);
      expect(isStateBanned('Sikkim')).toBe(true);
      expect(isStateBanned('Nagaland')).toBe(true);
    });

    it('permits compliant states', () => {
      expect(isStateBanned('DL')).toBe(false); // Delhi
      expect(isStateBanned('MH')).toBe(false); // Maharashtra
      expect(isStateBanned('KA')).toBe(false); // Karnataka
      expect(isStateBanned('WB')).toBe(false); // West Bengal
      expect(isStateBanned('UP')).toBe(false); // Uttar Pradesh
      expect(isStateBanned('Delhi')).toBe(false);
      expect(isStateBanned('Maharashtra')).toBe(false);
    });
  });

  describe('canActivate Guard logic', () => {
    it('permits user from compliant state (e.g. DL / MH)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ state: 'MH' });
      const context = createMockContext({ userId: 'u1' });

      const allowed = await guard.canActivate(context);
      expect(allowed).toBe(true);
    });

    it('blocks user registered in a banned state with ForbiddenException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ state: 'AS' });
      const context = createMockContext({ userId: 'u1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('blocks request when real-time header indicates banned location', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ state: 'MH' }); // User registered in MH
      const context = createMockContext({ userId: 'u1' }, { 'x-user-state': 'Telangana' }); // But currently in TG

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('allows access when user state is not yet set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ state: null });
      const context = createMockContext({ userId: 'u1' });

      const allowed = await guard.canActivate(context);
      expect(allowed).toBe(true);
    });
  });
});
