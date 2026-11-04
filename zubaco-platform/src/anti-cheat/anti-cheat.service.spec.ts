import { AntiCheatService } from './anti-cheat.service';

/**
 * Unit tests for AntiCheatService.analyzeGameResult — the fraud-signal engine.
 * Prisma + EnforcementService are mocked so we exercise the pure detection
 * thresholds: impossible score, timing anomaly, board tampering, client score
 * inflation, bot input cadence, and the 3-critical auto-enforcement trigger.
 */
describe('AntiCheatService', () => {
  const GAME = 'SLIDING_PUZZLE' as any; // max=2000, minReasonableTime=10000ms
  let service: AntiCheatService;
  let prisma: any;
  let enforcement: { enforce: jest.Mock; reverse: jest.Mock };

  beforeEach(() => {
    prisma = {
      gameSession: {
        findMany: jest.fn().mockResolvedValue([]), // no history -> skips score-anomaly
        count: jest.fn().mockResolvedValue(0), // few sessions -> skips rapid-progression
        updateMany: jest.fn().mockResolvedValue({}),
      },
      cheatFlag: {
        createMany: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0), // criticalCount -> no auto-enforce
      },
      refreshToken: { deleteMany: jest.fn().mockResolvedValue({}) },
    };
    enforcement = { enforce: jest.fn().mockResolvedValue({}), reverse: jest.fn().mockResolvedValue({}) };
    service = new AntiCheatService(prisma as any, enforcement as any);
  });

  const hasFlag = (r: any, type: string, severity?: string) =>
    r.details.some((f: any) => f.type === type && (!severity || f.severity === severity));

  it('raises no flags for a legitimate result', async () => {
    const r = await service.analyzeGameResult('u1', 's1', 500, 30000, GAME);
    expect(r.flags_raised).toBe(0);
    expect(prisma.cheatFlag.createMany).not.toHaveBeenCalled();
  });

  it('flags an impossible score above the theoretical maximum as CRITICAL', async () => {
    const r = await service.analyzeGameResult('u1', 's1', 999999, 30000, GAME);
    expect(hasFlag(r, 'IMPOSSIBLE_SCORE', 'CRITICAL')).toBe(true);
    expect(prisma.cheatFlag.createMany).toHaveBeenCalled();
  });

  it('flags a timing anomaly when completed faster than humanly possible', async () => {
    const r = await service.analyzeGameResult('u1', 's1', 500, 100, GAME);
    expect(hasFlag(r, 'TIMING_ANOMALY', 'HIGH')).toBe(true);
    expect(hasFlag(r, 'IMPOSSIBLE_SCORE')).toBe(false);
  });

  it('does not flag a zero score even when the duration is tiny', async () => {
    const r = await service.analyzeGameResult('u1', 's1', 0, 1, GAME);
    expect(hasFlag(r, 'TIMING_ANOMALY')).toBe(false);
  });

  it('flags board tampering (fingerprint mismatch) as CRITICAL', async () => {
    const r = await service.analyzeGameResult('u1', 's1', 500, 30000, GAME, {
      boardTampered: true,
    });
    expect(hasFlag(r, 'SESSION_TAMPERING', 'CRITICAL')).toBe(true);
  });

  describe('client score inflation', () => {
    it('flags a claimed score well above the server score', async () => {
      const r = await service.analyzeGameResult('u1', 's1', 100, 30000, GAME, {
        serverScore: 100,
        claimedScore: 1000, // threshold = 100 + max(10, 25) = 125
      });
      expect(hasFlag(r, 'SESSION_TAMPERING', 'HIGH')).toBe(true);
    });

    it('tolerates a claimed score within the allowed margin', async () => {
      const r = await service.analyzeGameResult('u1', 's1', 100, 30000, GAME, {
        serverScore: 100,
        claimedScore: 120, // below the 125 threshold
      });
      expect(hasFlag(r, 'SESSION_TAMPERING')).toBe(false);
    });
  });

  describe('bot input cadence', () => {
    it('flags 6+ sub-100ms intervals as a CRITICAL bot pattern', async () => {
      const r = await service.analyzeGameResult('u1', 's1', 500, 30000, GAME, {
        metadata: { input_log: [0, 50, 100, 150, 200, 250, 300] },
      });
      expect(hasFlag(r, 'INPUT_BOT_PATTERN', 'CRITICAL')).toBe(true);
    });

    it('flags 3-5 sub-100ms intervals as a HIGH bot pattern', async () => {
      const r = await service.analyzeGameResult('u1', 's1', 500, 30000, GAME, {
        metadata: { input_log: [0, 50, 100, 150, 1000] },
      });
      expect(hasFlag(r, 'INPUT_BOT_PATTERN', 'HIGH')).toBe(true);
    });

    it('flags near-zero variance cadence over many inputs as a HIGH bot pattern', async () => {
      const log = Array.from({ length: 12 }, (_, i) => i * 200); // constant 200ms spacing
      const r = await service.analyzeGameResult('u1', 's1', 500, 30000, GAME, {
        metadata: { input_log: log },
      });
      expect(hasFlag(r, 'INPUT_BOT_PATTERN', 'HIGH')).toBe(true);
    });

    it('ignores a short or human-like input log', async () => {
      const r = await service.analyzeGameResult('u1', 's1', 500, 30000, GAME, {
        metadata: { input_log: [0, 320, 610, 1400] },
      });
      expect(hasFlag(r, 'INPUT_BOT_PATTERN')).toBe(false);
    });
  });

  describe('Module 7.3 Speedhack & Drift Defenses', () => {
    it('flags client duration exceeding real server wallclock by > 3000ms', async () => {
      // Server started 10,000ms ago, but client reports duration 20,000ms (drift = 10,000ms > 3000ms)
      const startedAt = new Date(Date.now() - 10000);
      const r = await service.analyzeGameResult('u1', 's1', 500, 20000, GAME, { startedAt });
      expect(hasFlag(r, 'TIMING_ANOMALY', 'HIGH')).toBe(true);
      const flag = r.details.find((f: any) => f.details?.reason === 'wallclock_drift_exceeded');
      expect(flag).toBeDefined();
    });

    it('flags speedhack wallclock compression when real elapsed time is below physical minimum', async () => {
      // SLIDING_PUZZLE minimum reasonable time is 10,000ms. Wall clock elapsed is only 2,000ms.
      const startedAt = new Date(Date.now() - 2000);
      const r = await service.analyzeGameResult('u1', 's1', 500, 15000, GAME, { startedAt });
      expect(hasFlag(r, 'TIMING_ANOMALY', 'CRITICAL')).toBe(true);
      const flag = r.details.find((f: any) => f.details?.reason === 'speedhack_wallclock_compression');
      expect(flag).toBeDefined();
    });

    it('flags score velocity spike exceeding physiological ceiling (> 300 pts/sec)', async () => {
      // 1000 points in 1500ms -> 666.7 pts/sec > 300 ceiling
      const r = await service.analyzeGameResult('u1', 's1', 1000, 1500, GAME);
      expect(hasFlag(r, 'SCORE_ANOMALY', 'HIGH')).toBe(true);
      const flag = r.details.find((f: any) => f.details?.reason === 'score_velocity_ceiling_exceeded');
      expect(flag).toBeDefined();
    });

    it('allows normal scores and natural wallclock durations without flags', async () => {
      // Natural 25 seconds gameplay for 500 points
      const startedAt = new Date(Date.now() - 26000);
      const r = await service.analyzeGameResult('u1', 's1', 500, 25000, GAME, { startedAt });
      expect(r.flags_raised).toBe(0);
    });
  });

  it('auto-enforces when the user reaches 3 critical flags', async () => {
    prisma.cheatFlag.count.mockResolvedValue(3);
    await service.analyzeGameResult('u1', 's1', 999999, 30000, GAME);
    expect(enforcement.enforce).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', confirmed: true }),
    );
    expect(prisma.gameSession.updateMany).toHaveBeenCalled(); // session sweep
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
  });

  it('does not auto-enforce below the critical threshold', async () => {
    prisma.cheatFlag.count.mockResolvedValue(2);
    await service.analyzeGameResult('u1', 's1', 999999, 30000, GAME);
    expect(enforcement.enforce).not.toHaveBeenCalled();
  });
});
