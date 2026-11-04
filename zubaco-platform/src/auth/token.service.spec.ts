import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';

describe('TokenService (Token Family Rotation & Reuse Detection)', () => {
  let service: TokenService;
  let mockJwt: any;
  let mockPrisma: any;
  let mockRedis: any;

  let redisStore: Map<string, string>;
  let redisSets: Map<string, Set<string>>;

  beforeEach(() => {
    redisStore = new Map();
    redisSets = new Map();

    mockJwt = {
      sign: jest.fn().mockReturnValue('mock-access-token-jwt'),
      verify: jest.fn().mockReturnValue({ sub: 'user-123' }),
    };

    mockPrisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-db-1' }),
        findFirst: jest.fn().mockResolvedValue(null),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    mockRedis = {
      get: jest.fn(async (key: string) => redisStore.get(key) || null),
      set: jest.fn(async (key: string, val: string) => {
        redisStore.set(key, val);
      }),
      del: jest.fn(async (key: string) => {
        redisStore.delete(key);
      }),
      expire: jest.fn().mockResolvedValue(true),
      sadd: jest.fn(async (key: string, ...members: string[]) => {
        if (!redisSets.has(key)) redisSets.set(key, new Set());
        const set = redisSets.get(key)!;
        members.forEach((m) => set.add(m));
        return members.length;
      }),
      smembers: jest.fn(async (key: string) => {
        return Array.from(redisSets.get(key) || []);
      }),
      srem: jest.fn(async (key: string, ...members: string[]) => {
        const set = redisSets.get(key);
        if (!set) return 0;
        let removed = 0;
        members.forEach((m) => {
          if (set.delete(m)) removed++;
        });
        return removed;
      }),
    };

    service = new TokenService(
      mockJwt as unknown as JwtService,
      mockPrisma as unknown as PrismaService,
      mockRedis as unknown as RedisService,
    );
  });

  describe('generateTokenPair', () => {
    it('generates 15-minute access token and 7-day refresh token in a family', async () => {
      const pair = await service.generateTokenPair('user-1', 'device-mobile-1');

      expect(pair.accessToken).toBe('mock-access-token-jwt');
      expect(pair.refreshToken).toBeDefined();
      expect(pair.familyId).toBeDefined();
      expect(pair.userId).toBe('user-1');

      // Verify JWT sign called with 15m
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { sub: 'user-1', type: 'access' },
        expect.objectContaining({ expiresIn: '15m' }),
      );

      // Verify persisted to Redis and DB
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^rt:/),
        expect.stringContaining('"isUsed":false'),
        604800,
      );
    });
  });

  describe('rotateRefreshToken', () => {
    it('successfully rotates refresh token, keeping the same familyId', async () => {
      const initial = await service.generateTokenPair('user-1');
      const rotated = await service.rotateRefreshToken(initial.refreshToken);

      expect(rotated.refreshToken).not.toBe(initial.refreshToken);
      expect(rotated.familyId).toBe(initial.familyId);
      expect(rotated.userId).toBe('user-1');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalled();
    });

    it('detects refresh token reuse and revokes the ENTIRE token family', async () => {
      // 1. Initial login
      const pair1 = await service.generateTokenPair('user-1');

      // 2. Legitimate user rotates token -> gets pair2
      const pair2 = await service.rotateRefreshToken(pair1.refreshToken);
      expect(pair2.familyId).toBe(pair1.familyId);

      // 3. Attacker (or intercepted client) tries to reuse the old pair1 token!
      await expect(service.rotateRefreshToken(pair1.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );

      // 4. Verification: Entire family has now been revoked!
      // Even the latest valid token pair2 should now fail rotation because family was revoked
      await expect(service.rotateRefreshToken(pair2.refreshToken)).rejects.toThrow(
        /family has been revoked|Invalid or expired/,
      );
    });

    it('rejects an unknown or expired refresh token', async () => {
      await expect(service.rotateRefreshToken('unknown-uuid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Revocation and Logout', () => {
    it('revokes single refresh token and its family on logout', async () => {
      const pair = await service.generateTokenPair('user-1');
      await service.revokeRefreshToken(pair.refreshToken);

      await expect(service.rotateRefreshToken(pair.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('revokes all sessions and families on revokeAllUserTokens', async () => {
      const pair1 = await service.generateTokenPair('user-1');
      const pair2 = await service.generateTokenPair('user-1');

      await service.revokeAllUserTokens('user-1');

      await expect(service.rotateRefreshToken(pair1.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.rotateRefreshToken(pair2.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
      });
    });
  });
});
