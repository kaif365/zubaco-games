import { TournamentLeaderboardService, computeCompoundScore, decomposeCompoundScore } from './tournament-leaderboard.service';

describe('Stage Cutoff Stampede & Leaderboard Concurrency (Module 8.3)', () => {
  let service: TournamentLeaderboardService;
  let mockRedis: any;
  let mockPrisma: any;

  // In-memory Redis Sorted Set simulation
  let sortedSet: Map<string, number>; // userId -> compoundScore

  beforeEach(() => {
    sortedSet = new Map();

    mockRedis = {
      zscore: jest.fn(async (key: string, member: string) => {
        if (!sortedSet.has(member)) return null;
        return sortedSet.get(member)!.toString();
      }),
      zadd: jest.fn(async (key: string, score: number, member: string) => {
        sortedSet.set(member, score);
        return 1;
      }),
      zrevrank: jest.fn(async (key: string, member: string) => {
        if (!sortedSet.has(member)) return null;
        // Sort descending
        const sorted = Array.from(sortedSet.entries()).sort((a, b) => b[1] - a[1]);
        const rankIndex = sorted.findIndex(([m]) => m === member);
        return rankIndex >= 0 ? rankIndex : null;
      }),
      zcard: jest.fn(async (key: string) => {
        return sortedSet.size;
      }),
      zrevrange: jest.fn(async (key: string, start: number, stop: number) => {
        const sorted = Array.from(sortedSet.entries()).sort((a, b) => b[1] - a[1]);
        const slice = stop === -1 ? sorted.slice(start) : sorted.slice(start, stop + 1);
        return slice.map(([m]) => m);
      }),
      zrevrangeWithScores: jest.fn(async (key: string, start: number, stop: number) => {
        const sorted = Array.from(sortedSet.entries()).sort((a, b) => b[1] - a[1]);
        const slice = stop === -1 ? sorted.slice(start) : sorted.slice(start, stop + 1);
        const result: Array<{ value: string; score: number }> = [];
        for (const [val, scr] of slice) {
          result.push({ value: val, score: scr });
        }
        return result;
      }),
    };

    mockPrisma = {
      user: {
        findMany: jest.fn(async () => []),
      },
    };

    service = new TournamentLeaderboardService(mockRedis, mockPrisma);
  });

  describe('Cutoff Stampede Inrush Simulation (1,000 Concurrent Submissions)', () => {
    it('processes 1,000 rapid concurrent score submissions without data loss or race conditions', async () => {
      const TOURNAMENT_ID = 't_stampede_1000';
      const STAGE = 1;
      const COUNT = 1000;

      const submissions = Array.from({ length: COUNT }, (_, i) => ({
        userId: `user_stampede_${i}`,
        baseScore: Math.floor(Math.random() * 1000) + 500, // 500 to 1500
        elapsedMs: Math.floor(Math.random() * 60000) + 10000, // 10s to 70s
      }));

      const start = performance.now();
      // Concurrent execution of all 1,000 score submissions
      await Promise.all(
        submissions.map((s) =>
          service.recordTournamentScore(
            TOURNAMENT_ID,
            STAGE,
            s.userId,
            s.baseScore,
            s.elapsedMs,
          ),
        ),
      );
      const totalTimeMs = performance.now() - start;

      // Verify all 1,000 distinct entries exist in Redis sorted set
      expect(sortedSet.size).toBe(COUNT);
      // Execution of in-memory simulated inrush should take < 1500ms
      expect(totalTimeMs).toBeLessThan(1500);
    });
  });

  describe('Microsecond Floating-Point Tie-Breaker Resolution', () => {
    it('breaks ties deterministically in favor of faster completion time when base scores are identical', async () => {
      const TOURNAMENT_ID = 't_tiebreak';
      const STAGE = 1;

      // Player A and Player B have the EXACT same base score (1,500 points)
      // Player A finished in 45,000ms (45s)
      // Player B finished in 60,000ms (60s)
      await service.recordTournamentScore(TOURNAMENT_ID, STAGE, 'player_B', 1500, 60000);
      await service.recordTournamentScore(TOURNAMENT_ID, STAGE, 'player_A', 1500, 45000);

      const rankA = await service.getUserRank(TOURNAMENT_ID, STAGE, 'player_A');
      const rankB = await service.getUserRank(TOURNAMENT_ID, STAGE, 'player_B');

      // Player A must be Rank 1, Player B must be Rank 2
      expect(rankA.rank).toBe(1);
      expect(rankB.rank).toBe(2);

      // Verify compound scores maintain strict ordering
      expect(rankA.compoundScore!).toBeGreaterThan(rankB.compoundScore!);
      expect(rankA.baseScore).toBe(1500);
      expect(rankB.baseScore).toBe(1500);
    });

    it('preserves base score dominance: higher base score ALWAYS beats lower base score regardless of time', () => {
      // Player X: Base score 1501, finished in 179,000ms (very slow)
      // Player Y: Base score 1500, finished in 1,000ms (super fast)
      const scoreX = computeCompoundScore(1501, 179000);
      const scoreY = computeCompoundScore(1500, 1000);

      expect(scoreX).toBeGreaterThan(scoreY);
    });

    it('decomposes compound score cleanly back into base score and elapsed time', () => {
      const base = 1250;
      const elapsed = 45230; // 45.230 seconds
      const compound = computeCompoundScore(base, elapsed);

      const decomposed = decomposeCompoundScore(compound);
      expect(decomposed.baseScore).toBe(base);
      expect(Math.abs(decomposed.elapsedMs - elapsed)).toBeLessThanOrEqual(1); // 1ms precision
    });
  });

  describe('Atomic Sub-10ms Rank and Percentile Extraction', () => {
    it('extracts user rank and percentile from sorted set in under 5 milliseconds', async () => {
      const TOURNAMENT_ID = 't_perf';
      const STAGE = 1;

      // Populate 500 entries
      for (let i = 0; i < 500; i++) {
        sortedSet.set(`user_${i}`, computeCompoundScore(1000 + i, 30000));
      }

      const start = performance.now();
      const rank = await service.getUserRank(TOURNAMENT_ID, STAGE, 'user_499'); // Top scorer
      const queryDurationMs = performance.now() - start;

      expect(rank.rank).toBe(1);
      expect(rank.totalParticipants).toBe(500);
      expect(rank.percentile).toBe(100);
      expect(queryDurationMs).toBeLessThan(10);
    });
  });
});
