import { EnforcementService } from './enforcement.service';
import { EnforcementAction, EnforcementRequest } from './enforcement.types';
import { PlatformEventType } from '../../events/event.types';

describe('EnforcementService (Module 7.5)', () => {
  let service: EnforcementService;
  let prisma: any;
  let redis: any;
  let leaderboard: any;
  let webhook: any;
  let events: any;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (cb) => {
        const tx = {
          gameSession: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'sess_1',
              user_id: 'u1',
              game_type: 'SLIDING_PUZZLE',
              stage_entry_id: 'stage_1',
            }),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          stageEntry: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          user: {
            update: jest.fn().mockResolvedValue({ id: 'u1', is_banned: true }),
            findUnique: jest.fn().mockResolvedValue({ id: 'u1', is_banned: true }),
          },
          refreshToken: {
            deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return cb(tx);
      }),
    };

    redis = {
      setnx: jest.fn().mockResolvedValue(true),
      expire: jest.fn().mockResolvedValue(true),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    leaderboard = {
      removeScore: jest.fn().mockResolvedValue(true),
    };

    webhook = {
      emitEnforcementReversal: jest.fn().mockResolvedValue(true),
    };

    events = {
      publish: jest.fn().mockResolvedValue(true),
    };

    service = new EnforcementService(prisma, redis, leaderboard, webhook, events);
  });

  describe('Transactional Penalty Enforcement (enforce)', () => {
    it('executes full transactional penalty pipeline for confirmed violation', async () => {
      const req: EnforcementRequest = {
        userId: 'u1',
        sessionId: 'sess_1',
        reason: 'Confirmed memory tampering and impossible score',
        actions: [
          EnforcementAction.INVALIDATE_SESSION,
          EnforcementAction.REMOVE_LEADERBOARD_SCORE,
          EnforcementAction.REMOVE_TOURNAMENT_SCORE,
          EnforcementAction.REMOVE_TOURNAMENT_QUALIFICATION,
          EnforcementAction.INVALIDATE_REWARDS,
          EnforcementAction.PREVENT_WALLET_PAYOUT,
        ],
        confirmed: true,
      };

      const result = await service.enforce(req);

      expect(result.enforced).toBe(true);
      expect(result.alreadyEnforced).toBe(false);

      // Verify Redis lock acquired
      expect(redis.setnx).toHaveBeenCalledWith('acheat:enforce:sess_1', '1');
      expect(redis.expire).toHaveBeenCalledWith('acheat:enforce:sess_1', 86400);

      // Verify post-commit leaderboard score stripped
      expect(leaderboard.removeScore).toHaveBeenCalledWith('u1', 'SLIDING_PUZZLE');

      // Verify fast-path ban key written in Redis for zero-delay JWT rejection
      expect(redis.set).toHaveBeenCalledWith('auth:ban:u1', '1', 60);

      // Verify wallet webhook emitted for payout prevention
      expect(webhook.emitEnforcementReversal).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'u1', session_id: 'sess_1' }),
      );

      // Verify platform event emitted
      expect(events.publish).toHaveBeenCalledWith(
        PlatformEventType.ANTI_CHEAT_ENFORCED,
        expect.objectContaining({ user_id: 'u1', session_id: 'sess_1' }),
        'u1',
        expect.any(String),
      );
    });

    it('returns alreadyEnforced: true when concurrent or duplicate lock exists', async () => {
      redis.setnx.mockResolvedValue(false); // Lock already held

      const req: EnforcementRequest = {
        userId: 'u1',
        sessionId: 'sess_1',
        reason: 'Duplicate call',
        actions: [EnforcementAction.INVALIDATE_REWARDS],
        confirmed: true,
      };

      const result = await service.enforce(req);
      expect(result.enforced).toBe(false);
      expect(result.alreadyEnforced).toBe(true);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('Authoritative Penalty Reversal (reverse)', () => {
    it('atomically lifts ban, resets Redis ban key to 0, and emits ACCOUNT_RESTORED', async () => {
      const result = await service.reverse({
        userId: 'u1',
        reason: 'False positive appeal approved by supervisor',
        reversedBy: 'admin_alice',
      });

      expect(result.reversed).toBe(true);
      expect(result.alreadyReversed).toBe(false);
      expect(result.transitioned).toBe(true);

      // Fast-path Redis ban cache cleared to '0'
      expect(redis.set).toHaveBeenCalledWith('auth:ban:u1', '0', 60);

      // Account restored event emitted
      expect(events.publish).toHaveBeenCalledWith(
        PlatformEventType.ACCOUNT_RESTORED,
        expect.objectContaining({ user_id: 'u1', reason: expect.any(String) }),
        'u1',
        'account.restored:u1',
      );

      // Lock released
      expect(redis.del).toHaveBeenCalledWith('acheat:reverse:u1');
    });
  });
});

