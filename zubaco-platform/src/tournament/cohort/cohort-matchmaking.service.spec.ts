import { Test, TestingModule } from '@nestjs/testing';
import {
  CohortMatchmakingService,
  computeConsistentCohortShard,
  calculateRequiredCohorts,
  calculatePercentileCutoff,
  CONSOLIDATION_MIN_THRESHOLD,
} from './cohort-matchmaking.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('CohortMatchmakingService (Module 5.3 Certification)', () => {
  let service: CohortMatchmakingService;
  let prisma: {
    cohort: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    seasonEntry: {
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      cohort: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
      seasonEntry: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CohortMatchmakingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CohortMatchmakingService>(CohortMatchmakingService);
  });

  describe('Balanced Cohort Partitioning Math', () => {
    it('should size cohorts to maintain 50 to 100 player shards', () => {
      expect(calculateRequiredCohorts(40)).toBe(1);
      expect(calculateRequiredCohorts(100)).toBe(1);
      expect(calculateRequiredCohorts(200)).toBe(3); // 200 / 75 ~ 2.67 -> 3 (~67 per cohort)
      expect(calculateRequiredCohorts(750)).toBe(10); // 75 per cohort
      expect(calculateRequiredCohorts(1500)).toBe(20); // 75 per cohort
    });
  });

  describe('Consistent Hashing Invariants', () => {
    it('should deterministically assign identical userId + tournamentId to the same shard index', () => {
      const shardA = computeConsistentCohortShard('user-alpha', 'season-2026', 10);
      const shardB = computeConsistentCohortShard('user-alpha', 'season-2026', 10);
      expect(shardA).toBe(shardB);
      expect(shardA).toBeGreaterThanOrEqual(0);
      expect(shardA).toBeLessThan(10);
    });

    it('should evenly distribute a population across shards without hot-spots', () => {
      const totalUsers = 1000;
      const totalCohorts = 10;
      const counts = new Array(totalCohorts).fill(0);

      for (let i = 0; i < totalUsers; i++) {
        const shard = computeConsistentCohortShard(`user-${i}`, 'season-benchmark', totalCohorts);
        counts[shard]++;
      }

      // Expected ~100 per shard with statistical tolerance (e.g. 60 - 140)
      for (const count of counts) {
        expect(count).toBeGreaterThan(60);
        expect(count).toBeLessThan(140);
      }
    });
  });

  describe('Ceiling Percentile Elimination Cut-off Math', () => {
    it('should compute exact advancement quotas with ceil rounding guarantee', () => {
      // 100 players, 50% elimination -> 50 advance, 50 eliminated
      const cut100 = calculatePercentileCutoff(100, 50);
      expect(cut100.advancingCount).toBe(50);
      expect(cut100.eliminatedCount).toBe(50);

      // 75 players, 40% elimination -> ceil(75 * 0.6) = 45 advance, 30 eliminated
      const cut75 = calculatePercentileCutoff(75, 40);
      expect(cut75.advancingCount).toBe(45);
      expect(cut75.eliminatedCount).toBe(30);

      // 3 players, 50% elimination -> ceil(3 * 0.5) = 2 advance, 1 eliminated
      const cut3 = calculatePercentileCutoff(3, 50);
      expect(cut3.advancingCount).toBe(2);
      expect(cut3.eliminatedCount).toBe(1);

      // Boundary condition: 1 player -> 1 advances, 0 eliminated
      const cut1 = calculatePercentileCutoff(1, 50);
      expect(cut1.advancingCount).toBe(1);
      expect(cut1.eliminatedCount).toBe(0);
    });
  });

  describe('assignUserToBalancedCohort', () => {
    it('should assign player to deterministic cohort and return shard index', async () => {
      prisma.cohort.findFirst.mockResolvedValue({
        id: 'cohort-uuid-1',
        name: 'Cohort 1',
        season_id: 'season-101',
      });

      const res = await service.assignUserToBalancedCohort('user-1', 'season-101', 300);

      expect(res.cohortName).toMatch(/^Cohort \d+$/);
      expect(res.totalCohorts).toBe(4); // 300 / 75 = 4
      expect(res.shardIndex).toBeGreaterThanOrEqual(0);
      expect(res.shardIndex).toBeLessThan(4);
    });
  });

  describe('consolidateOrphanCohorts', () => {
    it('should merge cohorts with fewer than 25 players into adjacent cohorts', async () => {
      const mockCohorts = [
        { id: 'c1', name: 'Cohort 1', _count: { entries: 60 } },
        { id: 'c2', name: 'Cohort 2', _count: { entries: 70 } },
        { id: 'c3_orphan', name: 'Cohort 3', _count: { entries: 15 } }, // < 25
      ];

      prisma.cohort.findMany.mockResolvedValue(mockCohorts);

      const mergedCount = await service.consolidateOrphanCohorts('season-101');

      expect(mergedCount).toBe(1);
      expect(prisma.seasonEntry.updateMany).toHaveBeenCalledWith({
        where: { season_id: 'season-101', cohort_id: 'c3_orphan' },
        data: { cohort_id: 'c1' }, // smallest non-orphan target
      });
      expect(prisma.cohort.delete).toHaveBeenCalledWith({ where: { id: 'c3_orphan' } });
    });
  });
});
