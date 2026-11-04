import { Test, TestingModule } from '@nestjs/testing';
import { ReconnectionGraceService } from './reconnection-grace.service';
import { RedisService } from '../common/redis/redis.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventBusService } from '../events/event-bus.service';
import {
  WS_RECONNECTION_GRACE_TTL_SECONDS,
  REDIS_KEY_GRACE_PREFIX,
  REDIS_KEY_GRACE_EXPIRATIONS,
  REDIS_CHANNEL_TOURNAMENT_EVENTS,
} from './ws.constants';

describe('ReconnectionGraceService (Module 5.1 Certification)', () => {
  let service: ReconnectionGraceService;
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    zadd: jest.Mock;
    zrem: jest.Mock;
    zrangebyscore: jest.Mock;
    acquireLock: jest.Mock;
    publish: jest.Mock;
  };
  let prisma: {
    gameSession: {
      updateMany: jest.Mock;
    };
  };
  let events: {
    publish: jest.Mock;
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      zadd: jest.fn(),
      zrem: jest.fn(),
      zrangebyscore: jest.fn(),
      acquireLock: jest.fn().mockResolvedValue(true),
      publish: jest.fn().mockResolvedValue(1),
    };

    prisma = {
      gameSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    events = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconnectionGraceService,
        { provide: RedisService, useValue: redis },
        { provide: PrismaService, useValue: prisma },
        { provide: EventBusService, useValue: events },
      ],
    }).compile();

    service = module.get<ReconnectionGraceService>(ReconnectionGraceService);
  });

  describe('saveGraceSnapshot', () => {
    it('should store snapshot in Redis with 30-second TTL and register in expiration sorted set', async () => {
      const now = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const snapshot = await service.saveGraceSnapshot({
        matchId: 'match-101',
        userId: 'user-001',
        tournamentId: 'tourn-99',
        stageNumber: 2,
        level: 5,
        currentScore: 1250,
        lastSeq: 42,
        disconnectedAt: now,
      });

      expect(snapshot.expiresAt).toBe(now + WS_RECONNECTION_GRACE_TTL_SECONDS * 1000);
      expect(snapshot.status).toBe('DISCONNECTED_TRANSIENT');

      expect(redis.set).toHaveBeenCalledWith(
        `${REDIS_KEY_GRACE_PREFIX}match-101:user-001`,
        expect.stringContaining('"currentScore":1250'),
        30,
      );

      expect(redis.zadd).toHaveBeenCalledWith(
        REDIS_KEY_GRACE_EXPIRATIONS,
        now + 30000,
        'match-101:user-001',
      );
    });
  });

  describe('resumeSession', () => {
    it('should cleanly resume active session if reconnected within 30-second window', async () => {
      const now = 1700000010000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const storedSnapshot = {
        matchId: 'match-101',
        userId: 'user-001',
        tournamentId: 'tourn-99',
        stageNumber: 2,
        level: 5,
        currentScore: 1250,
        lastSeq: 42,
        disconnectedAt: now - 10000,
        expiresAt: now + 20000,
        status: 'DISCONNECTED_TRANSIENT',
        metadata: { matchTicket: 'ticket-xyz' },
      };

      redis.get.mockResolvedValue(JSON.stringify(storedSnapshot));

      const result = await service.resumeSession('match-101', 'user-001', 'ticket-xyz');

      expect(result.resumed).toBe(true);
      expect(result.snapshot).toBeDefined();
      expect(result.snapshot?.currentScore).toBe(1250);
      expect(result.snapshot?.level).toBe(5);
      expect(result.snapshot?.status).toBe('RESUMED');

      // Verify Redis grace key and sorted set entry are cleaned up
      expect(redis.del).toHaveBeenCalledWith(`${REDIS_KEY_GRACE_PREFIX}match-101:user-001`);
      expect(redis.zrem).toHaveBeenCalledWith(
        REDIS_KEY_GRACE_EXPIRATIONS,
        'match-101:user-001',
      );
    });

    it('should reject resumption and auto-forfeit if grace window has expired', async () => {
      const now = 1700000040000; // 40 seconds later (> 30s)
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const expiredSnapshot = {
        matchId: 'match-101',
        userId: 'user-001',
        tournamentId: 'tourn-99',
        stageNumber: 2,
        level: 5,
        currentScore: 1250,
        lastSeq: 42,
        disconnectedAt: now - 40000,
        expiresAt: now - 10000,
        status: 'DISCONNECTED_TRANSIENT',
      };

      redis.get.mockResolvedValue(JSON.stringify(expiredSnapshot));

      const result = await service.resumeSession('match-101', 'user-001');

      expect(result.resumed).toBe(false);
      expect(result.reason).toBe('GRACE_PERIOD_EXPIRED');

      // Database session updated to ABANDONED / final score locked
      expect(prisma.gameSession.updateMany).toHaveBeenCalledWith({
        where: { id: 'match-101', user_id: 'user-001', outcome: null },
        data: expect.objectContaining({ outcome: 'ABANDONED', final_score: 1250 }),
      });
    });

    it('should reject resumption if match ticket is mismatched', async () => {
      const now = 1700000005000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const snapshot = {
        matchId: 'match-101',
        userId: 'user-001',
        tournamentId: 'tourn-99',
        stageNumber: 2,
        level: 5,
        currentScore: 1250,
        lastSeq: 42,
        disconnectedAt: now - 5000,
        expiresAt: now + 25000,
        status: 'DISCONNECTED_TRANSIENT',
        metadata: { matchTicket: 'correct-ticket' },
      };

      redis.get.mockResolvedValue(JSON.stringify(snapshot));

      const result = await service.resumeSession('match-101', 'user-001', 'wrong-ticket');

      expect(result.resumed).toBe(false);
      expect(result.reason).toBe('INVALID_MATCH_TICKET');
    });
  });

  describe('forfeitSession', () => {
    it('should finalize score, mark session ABANDONED, and broadcast event to multi-node cluster', async () => {
      const snapshot = {
        matchId: 'match-202',
        userId: 'user-002',
        tournamentId: 'tourn-77',
        stageNumber: 3,
        level: 4,
        currentScore: 890,
        lastSeq: 15,
        disconnectedAt: Date.now() - 31000,
        expiresAt: Date.now() - 1000,
        status: 'DISCONNECTED_TRANSIENT' as const,
      };

      redis.get.mockResolvedValue(JSON.stringify(snapshot));

      const forfeit = await service.forfeitSession('match-202', 'user-002');

      expect(forfeit.status).toBe('FORFEITED');
      expect(forfeit.finalScore).toBe(890);
      expect(forfeit.tournamentId).toBe('tourn-77');

      expect(redis.del).toHaveBeenCalledWith(`${REDIS_KEY_GRACE_PREFIX}match-202:user-002`);
      expect(redis.zrem).toHaveBeenCalledWith(
        REDIS_KEY_GRACE_EXPIRATIONS,
        'match-202:user-002',
      );

      expect(redis.publish).toHaveBeenCalledWith(
        REDIS_CHANNEL_TOURNAMENT_EVENTS,
        expect.stringContaining('"event":"MATCH_FORFEITED"'),
      );
    });
  });

  describe('reapExpiredGraceSessions', () => {
    it('should query Redis sorted set for expired sessions and forfeit them in batch', async () => {
      const now = 1700000050000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      redis.zrangebyscore.mockResolvedValue(['match-1:user-1', 'match-2:user-2']);
      redis.get.mockResolvedValue(null);

      const count = await service.reapExpiredGraceSessions();

      expect(count).toBe(2);
      expect(redis.zrangebyscore).toHaveBeenCalledWith(
        REDIS_KEY_GRACE_EXPIRATIONS,
        0,
        now,
        50,
      );
    });
  });
});
