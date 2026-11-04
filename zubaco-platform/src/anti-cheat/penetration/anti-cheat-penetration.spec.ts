import { AntiCheatService } from '../anti-cheat.service';
import { CryptographicSessionService } from '../crypto/cryptographic-session.service';
import { CadenceAnalyzerService } from '../heuristics/cadence-analyzer.service';
import { DeviceDetectionService } from '../device-detection.service';
import { EnforcementService } from '../enforcement/enforcement.service';

/**
 * Automated Anti-Cheat Penetration & Exploitation Test Suite (Module 7.5).
 * Simulates adversarial penetration vectors against the Zubaco cognitive gaming platform:
 *  - Vector 1: Arbitrary Memory Score Inflation & Ceiling Bypasses
 *  - Vector 2: Speedhack & Clock Acceleration Timewarp Exploits
 *  - Vector 3: Bot Injection, Superhuman Tap Bursts & Zero-Jitter Touch Macros
 *  - Vector 4: Sybil Device Clustering & Tournament Collusion Attacks
 *  - Vector 5: Cryptographic Match Ticket Forgery & Replay Attacks
 */
describe('Anti-Cheat Penetration & Exploit Simulation Suite', () => {
  let antiCheatService: AntiCheatService;
  let cryptoService: CryptographicSessionService;
  let cadenceService: CadenceAnalyzerService;
  let deviceService: DeviceDetectionService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockEnforcement: any;

  beforeEach(() => {
    mockPrisma = {
      gameSession: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      cheatFlag: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
      deviceFingerprint: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      user: {
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' }),
      },
      refreshToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      setnx: jest.fn().mockResolvedValue(true),
      expire: jest.fn().mockResolvedValue(true),
      del: jest.fn().mockResolvedValue(1),
    };

    mockEnforcement = {
      enforce: jest.fn().mockResolvedValue({ enforced: true, alreadyEnforced: false, actionsApplied: [] }),
      reverse: jest.fn().mockResolvedValue({ reversed: true, alreadyReversed: false, transitioned: true }),
    };

    cadenceService = new CadenceAnalyzerService();
    cryptoService = new CryptographicSessionService(mockRedis);
    deviceService = new DeviceDetectionService(mockPrisma);
    antiCheatService = new AntiCheatService(mockPrisma, mockEnforcement, cadenceService);
  });

  describe('Adversarial Vector 1: Arbitrary Score Inflation & Ceiling Tampering', () => {
    it('intercepts and neutralizes injected astronomical scores above theoretical ceiling', async () => {
      // Attacker tampers with game memory, submitting 999,999 on SLIDING_PUZZLE (max: 2000)
      const attackScore = 999999;
      const durationMs = 45000;

      const verdict = await antiCheatService.analyzeGameResult(
        'attacker_01',
        'sess_exploit_01',
        attackScore,
        durationMs,
        'SLIDING_PUZZLE' as any,
      );

      expect(verdict.flags_raised).toBeGreaterThanOrEqual(1);
      const impossibleFlag = verdict.details.find((f: any) => f.type === 'IMPOSSIBLE_SCORE');
      expect(impossibleFlag).toBeDefined();
      expect(impossibleFlag.severity).toBe('CRITICAL');
      expect(impossibleFlag.details.max_possible).toBe(2000);
      expect(mockPrisma.cheatFlag.createMany).toHaveBeenCalled();
    });

    it('intercepts impossible score velocity burst (> 300 points per second)', async () => {
      // Attacker rapidly injects score packets (1500 points in 1000ms = 1500 pts/s)
      const verdict = await antiCheatService.analyzeGameResult(
        'attacker_01',
        'sess_exploit_01b',
        1500,
        1000,
        'SLIDING_PUZZLE' as any,
      );

      const spikeFlag = verdict.details.find(
        (f: any) => f.details?.reason === 'score_velocity_ceiling_exceeded',
      );
      expect(spikeFlag).toBeDefined();
      expect(spikeFlag.severity).toBe('HIGH');
    });
  });

  describe('Adversarial Vector 2: Speedhack & Time Acceleration Exploits', () => {
    it('detects time warp acceleration when real wall clock elapsed time is physically impossible', async () => {
      // Attacker uses game speedhack: finishes puzzle in 500ms of real elapsed time (min reasonable: 10,000ms)
      const startedAt = new Date(Date.now() - 500);
      const verdict = await antiCheatService.analyzeGameResult(
        'attacker_02',
        'sess_speedhack_01',
        500,
        15000,
        'SLIDING_PUZZLE' as any,
        { startedAt },
      );

      const compressionFlag = verdict.details.find(
        (f: any) => f.details?.reason === 'speedhack_wallclock_compression',
      );
      expect(compressionFlag).toBeDefined();
      expect(compressionFlag.severity).toBe('CRITICAL');
    });

    it('detects wall-clock drift anomaly when client claims excessive unearned duration', async () => {
      // Attacker claims 60,000ms duration, but server session started only 10,000ms ago (+ 3000ms tolerance)
      const startedAt = new Date(Date.now() - 10000);
      const verdict = await antiCheatService.analyzeGameResult(
        'attacker_02',
        'sess_drift_01',
        500,
        60000,
        'SLIDING_PUZZLE' as any,
        { startedAt },
      );

      const driftFlag = verdict.details.find(
        (f: any) => f.details?.reason === 'wallclock_drift_exceeded',
      );
      expect(driftFlag).toBeDefined();
      expect(driftFlag.severity).toBe('HIGH');
    });
  });

  describe('Adversarial Vector 3: Bot Injection & Touch Cadence Emulation', () => {
    it('flags superhuman neuromuscular tap bursts (< 50ms) as CRITICAL bot automation', () => {
      // Script injects tap events at 20ms intervals (superhuman)
      const burstInputs = [0, 20, 40, 60, 80, 100, 120];
      const result = cadenceService.analyze({ input_log: burstInputs });

      expect(result.isCheat).toBe(true);
      expect(result.flagType).toBe('INPUT_BOT_PATTERN');
      expect(result.severity).toBe('CRITICAL');
      expect(result.metrics.sub50msCount).toBe(6);
    });

    it('flags zero-variance clockwork interval macros (std dev < 5ms)', () => {
      // Replay macro executes taps at exactly 150ms clockwork spacing
      const clockworkInputs = Array.from({ length: 10 }, (_, i) => i * 150);
      const result = cadenceService.analyze({ input_log: clockworkInputs });

      expect(result.isCheat).toBe(true);
      expect(result.metrics.stdDevMs).toBe(0);
      expect(result.reason).toContain('Robotic clockwork cadence');
    });

    it('flags synthetic auto-clicker with pixel-perfect coordinate clamping', () => {
      // Synthetic click script clicks exact identical coordinate without touch digit wobble
      const syntheticEvents = [
        { t: 0, x: 500, y: 700 },
        { t: 200, x: 500, y: 700 },
        { t: 450, x: 500, y: 700 },
        { t: 750, x: 500, y: 700 },
        { t: 1100, x: 500, y: 700 },
      ];

      const result = cadenceService.analyze(syntheticEvents);
      expect(result.isCheat).toBe(true);
      expect(result.reason).toContain('Synthetic click coordinate injection');
    });
  });

  describe('Adversarial Vector 4: Multi-Account Sybil Farming & Collusion', () => {
    it('blocks collusive multi-account entry into identical tournament cohort from same device', async () => {
      mockPrisma.gameSession.findMany.mockResolvedValue([{ user_id: 'colluder_A' }]);
      mockPrisma.deviceFingerprint.findFirst.mockResolvedValue({ user_id: 'colluder_A' });

      const check = await deviceService.validateTournamentCohortDevice(
        'tournament_grand_prix',
        'colluder_B',
        'shared_hardware_hash_999',
      );

      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('COLLUSION_DEVICE_COHORT_VIOLATION');
      expect(check.conflictingUserId).toBe('colluder_A');
    });

    it('flags device farming clusters with 3+ accounts as CRITICAL risk', async () => {
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue([
        { user_id: 'account_02', first_seen_at: new Date(), session_count: 10 },
        { user_id: 'account_03', first_seen_at: new Date(), session_count: 12 },
      ]);

      const report = await deviceService.detectDuplicateDevice('account_01', 'farm_hardware_hash');
      expect(report.flagged).toBe(true);
      expect(report.flags[0].severity).toBe('CRITICAL');
      expect(report.flags[0].details.shared_count).toBe(3);
    });
  });

  describe('Adversarial Vector 5: Cryptographic Match Ticket Forgery & Replay Attacks', () => {
    it('detects and rejects tampered HMAC verification tickets', () => {
      const ticket = cryptoService.issueMatchTicket(
        'sess_crypto_01',
        'u_fair',
        'SLIDING_PUZZLE',
        'server_seed_hash_abc123',
        1,
      );

      // Attacker forges the ticket payload
      const tamperedTicket = ticket + 'forged';
      const isValid = cryptoService.verifyMatchTicket(
        tamperedTicket,
        'sess_crypto_01',
        'u_fair',
        'SLIDING_PUZZLE',
        'server_seed_hash_abc123',
        1,
      );

      expect(isValid).toBe(false);

      // Valid ticket passes
      const isCleanValid = cryptoService.verifyMatchTicket(
        ticket,
        'sess_crypto_01',
        'u_fair',
        'SLIDING_PUZZLE',
        'server_seed_hash_abc123',
        1,
      );
      expect(isCleanValid).toBe(true);
    });

    it('neutralizes replay attacks via single-use token consumption in Redis', async () => {
      // First attempt succeeds and consumes ticket
      mockRedis.setnx.mockResolvedValue(true);
      const attempt1 = await cryptoService.acquireSingleUseLock('sess_crypto_01');
      expect(attempt1).toBe(true);

      // Replay attempt by attacker: Redis setnx returns false
      mockRedis.setnx.mockResolvedValue(false);
      const attempt2 = await cryptoService.acquireSingleUseLock('sess_crypto_01');
      expect(attempt2).toBe(false);
    });
  });
});

