import { Test, TestingModule } from '@nestjs/testing';
import {
  TournamentLeaderboardService,
  computeCompoundScore,
  decomposeCompoundScore,
  DEFAULT_MAX_MATCH_TIME_MS,
} from './tournament-leaderboard.service';
import { RedisService } from '../common/redis/redis.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('TournamentLeaderboardService (Module 5.4 Certification)', () => {
  let service: TournamentLeaderboardService;
  let redis: {
    zscore: jest.Mock;
    zadd: jest.Mock;
    zrevrank: jest.Mock;
    zrevrange: jest.Mock;
  };
  let prisma: {
    user: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    redis = {
      zscore: jest.fn(),
      zadd: jest.fn().mockResolvedValue(1),
      zrevrank: jest.fn(),
      zrevrange: jest.fn(),
    };

    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'u1', display_name: 'Player One', username: 'p1', avatar_url: null },
          { id: 'u2', display_name: 'Player Two', username: 'p2', avatar_url: null },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentLeaderboardService,
        { provide: RedisService, useValue: redis },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TournamentLeaderboardService>(TournamentLeaderboardService);
  });

  describe('Compound Score Mathematical Invariants', () => {
    it('higher base score must ALWAYS rank higher than lower base score', () => {
      // Player A: 1,501 points, slow finish (179,000 ms elapsed, 1,000 ms remaining)
      const scoreA = computeCompoundScore(1501, 179000);

      // Player B: 1,500 points, instant finish (1,000 ms elapsed, 179,000 ms remaining)
      const scoreB = computeCompoundScore(1500, 1000);

      expect(scoreA).toBeGreaterThan(scoreB);
    });

    it('identical base scores must be broken deterministically by speed', () => {
      // Player 1: 2,000 points in 45,000 ms (faster)
      const scoreFast = computeCompoundScore(2000, 45000);

      // Player 2: 2,000 points in 60,000 ms (slower)
      const scoreSlow = computeCompoundScore(2000, 60000);

      expect(scoreFast).toBeGreaterThan(scoreSlow);
      expect(Math.floor(scoreFast)).toBe(2000);
      expect(Math.floor(scoreSlow)).toBe(2000);
    });

    it('should accurately decompose compound score into baseScore and elapsedMs', () => {
      const originalBase = 3500;
      const originalElapsed = 54321;

      const compound = computeCompoundScore(originalBase, originalElapsed);
      const decomp = decomposeCompoundScore(compound);

      expect(decomp.baseScore).toBe(originalBase);
      expect(decomp.elapsedMs).toBe(originalElapsed);
    });
  });

  describe('recordTournamentScore', () => {
    it('should insert new score when no prior score exists', async () => {
      redis.zscore.mockResolvedValue(null);
      redis.zrevrank.mockResolvedValue(0); // 0-indexed top rank

      const res = await service.recordTournamentScore(
        'tourn-1',
        2,
        'u1',
        2500,
        30000,
        'cohort-alpha',
      );

      expect(res.updated).toBe(true);
      expect(res.rank).toBe(1);
      expect(redis.zadd).toHaveBeenCalledWith(
        'lb:tourn:tourn-1:stage:2:cohort:cohort-alpha',
        expect.any(Number),
        'u1',
      );
    });

    it('should ignore score update if new score is lower than existing score', async () => {
      // Existing score is 2500.150000
      redis.zscore.mockResolvedValue('2500.150000');
      redis.zrevrank.mockResolvedValue(2);

      // New score is 2400 in 10000ms
      const res = await service.recordTournamentScore(
        'tourn-1',
        2,
        'u1',
        2400,
        10000,
        'cohort-alpha',
      );

      expect(res.updated).toBe(false);
      expect(redis.zadd).not.toHaveBeenCalled();
    });
  });

  describe('getUserRank', () => {
    it('should calculate 1-indexed rank and percentile in O(log N)', async () => {
      redis.zrevrank.mockResolvedValue(4); // 5th place
      redis.zscore.mockResolvedValue('1800.120000');
      redis.zrevrange.mockResolvedValue(['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u10']); // 10 total

      const rankResult = await service.getUserRank('tourn-1', 1, 'u5', 'cohort-1');

      expect(rankResult.rank).toBe(5);
      expect(rankResult.totalParticipants).toBe(10);
      expect(rankResult.baseScore).toBe(1800);
      expect(rankResult.percentile).toBe(56); // (10 - 5) / (10 - 1) * 100 ~ 55.5% -> 56%
    });
  });

  describe('getLeaderboard', () => {
    it('should return paginated entries with decoded base scores and user details', async () => {
      // Redis zrevrange withscores returns alternating [member, score, member, score]
      redis.zrevrange
        .mockResolvedValueOnce(['u1', '3000.120000', 'u2', '3000.090000'])
        .mockResolvedValueOnce(['u1', 'u2']);

      const result = await service.getLeaderboard('tourn-1', 1, 'cohort-1', 1, 10);

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[0].userId).toBe('u1');
      expect(result.entries[0].displayName).toBe('Player One');
      expect(result.entries[0].baseScore).toBe(3000);
      expect(result.entries[1].rank).toBe(2);
      expect(result.entries[1].userId).toBe('u2');
    });
  });
});
