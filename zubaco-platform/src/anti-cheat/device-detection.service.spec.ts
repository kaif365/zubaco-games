import { DeviceDetectionService } from './device-detection.service';

describe('DeviceDetectionService (Module 7.4)', () => {
  let service: DeviceDetectionService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      deviceFingerprint: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      gameSession: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      cheatFlag: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    service = new DeviceDetectionService(prisma as any);
  });

  describe('Hardware Device Fingerprint Hashing & Normalization', () => {
    it('generates a deterministic 64-character SHA-256 hash', () => {
      const components = {
        deviceId: 'android_id_12345',
        platform: 'android',
        model: 'Pixel 7',
        brand: 'Google',
        osVersion: '14.0',
        screenResolution: '1080x2400',
      };

      const hash1 = service.generateFingerprint(components);
      const hash2 = service.generateFingerprint(components);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
    });

    it('produces identical hash regardless of property insertion order or spacing/casing', () => {
      const compA = {
        model: ' Pixel 7 ',
        platform: 'Android',
        deviceId: 'ID_999',
      };
      const compB = {
        deviceId: 'id_999',
        platform: 'android',
        model: 'pixel 7',
      };

      const hashA = service.generateFingerprint(compA);
      const hashB = service.generateFingerprint(compB);

      expect(hashA).toBe(hashB);
    });

    it('returns empty string for null, undefined, or empty components', () => {
      expect(service.generateFingerprint(null as any)).toBe('');
      expect(service.generateFingerprint(undefined as any)).toBe('');
      expect(service.generateFingerprint({})).toBe('');
    });
  });

  describe('Multi-Account & Duplicate Device Detection', () => {
    it('does not flag when the device belongs solely to the current user', async () => {
      prisma.deviceFingerprint.findMany.mockResolvedValue([]);

      const result = await service.detectDuplicateDevice('user_1', 'hash_abc');
      expect(result.flagged).toBe(false);
      expect(result.flags).toHaveLength(0);
    });

    it('flags HIGH severity when 2 accounts share the same device', async () => {
      // Another user shares this device
      prisma.deviceFingerprint.findMany.mockResolvedValue([
        { user_id: 'user_2', first_seen_at: new Date(), session_count: 5 },
      ]);

      const result = await service.detectDuplicateDevice('user_1', 'hash_abc');
      expect(result.flagged).toBe(true);
      expect(result.flags[0].severity).toBe('HIGH');
      expect(result.flags[0].details.shared_count).toBe(2);
      expect(result.flags[0].details.shared_users).toContain('user_2');
    });

    it('flags CRITICAL severity when 3 or more accounts share the same device (device farming)', async () => {
      // 2 other users share this device (total 3 accounts)
      prisma.deviceFingerprint.findMany.mockResolvedValue([
        { user_id: 'user_2', first_seen_at: new Date(), session_count: 5 },
        { user_id: 'user_3', first_seen_at: new Date(), session_count: 8 },
      ]);

      const result = await service.detectDuplicateDevice('user_1', 'hash_abc');
      expect(result.flagged).toBe(true);
      expect(result.flags[0].severity).toBe('CRITICAL');
      expect(result.flags[0].details.shared_count).toBe(3);
    });
  });

  describe('IP Velocity & Network Correlation in Tournaments', () => {
    it('ignores non-tournament sessions or missing IP', async () => {
      const res1 = await service.detectIPCorrelation('u1', '', 's1', 'TOURNAMENT');
      expect(res1.flagged).toBe(false);

      const res2 = await service.detectIPCorrelation('u1', '192.168.1.1', 's1', 'SOLO');
      expect(res2.flagged).toBe(false);
    });

    it('flags HIGH when 3+ other users play tournament from the same IP in the last hour', async () => {
      prisma.gameSession.findMany.mockResolvedValue([
        { user_id: 'u2' },
        { user_id: 'u3' },
        { user_id: 'u4' },
      ]);

      const result = await service.detectIPCorrelation('u1', '203.0.113.10', 's1', 'TOURNAMENT');
      expect(result.flagged).toBe(true);
      expect(result.flags[0].type).toBe('DEVICE_DUPLICATE');
      expect(result.flags[0].severity).toBe('HIGH');
      expect(result.flags[0].details.other_users_count).toBe(3);
    });
  });

  describe('Anti-Sybil Tournament Cohort Constraint (No Shared Device)', () => {
    it('allows entry when no other tournament participant shares the device', async () => {
      prisma.gameSession.findMany.mockResolvedValue([
        { user_id: 'u2' },
        { user_id: 'u3' },
      ]);
      prisma.deviceFingerprint.findFirst.mockResolvedValue(null);

      const verdict = await service.validateTournamentCohortDevice('tourn_100', 'u1', 'dev_hash_clean');
      expect(verdict.allowed).toBe(true);
      expect(verdict.reason).toBeUndefined();
    });

    it('prohibits entry when another participant in the same tournament shares the device', async () => {
      prisma.gameSession.findMany.mockResolvedValue([
        { user_id: 'u2' },
        { user_id: 'u3' },
      ]);
      // user_2 already entered tournament using this same device fingerprint
      prisma.deviceFingerprint.findFirst.mockResolvedValue({ user_id: 'u2' });

      const verdict = await service.validateTournamentCohortDevice('tourn_100', 'u1', 'dev_hash_shared');
      expect(verdict.allowed).toBe(false);
      expect(verdict.reason).toBe('COLLUSION_DEVICE_COHORT_VIOLATION');
      expect(verdict.conflictingUserId).toBe('u2');
    });
  });

  describe('Simultaneous Multi-Session Device Lockout Guard', () => {
    it('detects when an active in-flight session exists on the device', async () => {
      prisma.deviceFingerprint.findMany.mockResolvedValue([{ user_id: 'u1' }]);
      prisma.gameSession.findFirst.mockResolvedValue({ id: 'sess_active_99', user_id: 'u1' });

      const check = await service.checkActiveDeviceSession('dev_hash_busy');
      expect(check.hasActiveSession).toBe(true);
      expect(check.activeSessionId).toBe('sess_active_99');
      expect(check.userId).toBe('u1');
    });

    it('returns false when no active session exists on the device', async () => {
      prisma.deviceFingerprint.findMany.mockResolvedValue([{ user_id: 'u1' }]);
      prisma.gameSession.findFirst.mockResolvedValue(null);

      const check = await service.checkActiveDeviceSession('dev_hash_free');
      expect(check.hasActiveSession).toBe(false);
    });
  });

  describe('Device Risk Scoring & Fraud Radar Intelligence', () => {
    it('returns LOW risk score for single-user device with clean history', async () => {
      prisma.deviceFingerprint.findMany.mockResolvedValue([
        { user_id: 'u1', user: { id: 'u1', is_banned: false } },
      ]);
      prisma.cheatFlag.count.mockResolvedValue(0);

      const report = await service.calculateDeviceRiskScore('hash_clean');
      expect(report.riskScore).toBe(0);
      expect(report.riskLevel).toBe('LOW');
      expect(report.hasBannedAccount).toBe(false);
    });

    it('escalates risk to CRITICAL when associated with a banned account and cheat flags', async () => {
      prisma.deviceFingerprint.findMany.mockResolvedValue([
        { user_id: 'u1', user: { id: 'u1', is_banned: false } },
        { user_id: 'u2', user: { id: 'u2', is_banned: true } },
      ]);
      prisma.cheatFlag.count.mockResolvedValue(3);

      const report = await service.calculateDeviceRiskScore('hash_tainted');
      expect(report.riskScore).toBe(100); // 30 (dual account) + 80 (banned) + 30 (flags) clamped to 100
      expect(report.riskLevel).toBe('CRITICAL');
      expect(report.hasBannedAccount).toBe(true);
      expect(report.factors).toContain('banned_account_associated');
      expect(report.factors).toContain('dual_account_sharing');
    });
  });

  describe('Device Fingerprint Persistence (upsertFingerprint)', () => {
    it('upserts fingerprint with first_seen_at and increments session_count', async () => {
      await service.upsertFingerprint('u1', 'hash_test_123', { model: 'Pixel 8' });

      expect(prisma.deviceFingerprint.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            user_id_fingerprint_hash: { user_id: 'u1', fingerprint_hash: 'hash_test_123' },
          },
          create: expect.objectContaining({
            user_id: 'u1',
            fingerprint_hash: 'hash_test_123',
          }),
          update: expect.objectContaining({
            session_count: { increment: 1 },
          }),
        }),
      );
    });
  });
});

