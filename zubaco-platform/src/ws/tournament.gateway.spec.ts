import { Test, TestingModule } from '@nestjs/testing';
import { TournamentGateway } from './tournament.gateway';
import { ReconnectionGraceService } from './reconnection-grace.service';
import { RedisService } from '../common/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { WS_HEARTBEAT_INTERVAL_MS, WS_HEARTBEAT_TIMEOUT_MS } from './ws.constants';

describe('TournamentGateway (Module 5.1 Protocol Verification)', () => {
  let gateway: TournamentGateway;
  let graceService: {
    saveGraceSnapshot: jest.Mock;
    resumeSession: jest.Mock;
  };
  let redis: {
    set: jest.Mock;
  };
  let jwtService: {
    verify: jest.Mock;
  };

  beforeEach(async () => {
    graceService = {
      saveGraceSnapshot: jest.fn().mockResolvedValue({}),
      resumeSession: jest.fn(),
    };
    redis = {
      set: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentGateway,
        { provide: ReconnectionGraceService, useValue: graceService },
        { provide: RedisService, useValue: redis },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    gateway = module.get<TournamentGateway>(TournamentGateway);
    gateway.server = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
      emit: jest.fn(),
    } as any;
  });

  describe('Gateway Heartbeat Configuration Invariant', () => {
    it('should adhere to strict 5000ms ping/pong interval and timeout invariants', () => {
      expect(WS_HEARTBEAT_INTERVAL_MS).toBe(5000);
      expect(WS_HEARTBEAT_TIMEOUT_MS).toBe(5000);
    });

    it('should reply with server time and interval on heartbeat event', () => {
      const client = { emit: jest.fn() } as any;
      gateway.handleHeartbeat(client);

      expect(client.emit).toHaveBeenCalledWith('heartbeat-ack', {
        serverTime: expect.any(Number),
        intervalMs: 5000,
      });
    });
  });

  describe('handleConnection', () => {
    it('should authenticate client with valid JWT and register session in Redis', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-valid-1' });

      const client = {
        id: 'socket-abc-123',
        handshake: {
          auth: { token: 'valid-jwt-token' },
          headers: {},
        },
        data: {},
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      await gateway.handleConnection(client);

      expect(client.data.userId).toBe('user-valid-1');
      expect(client.join).toHaveBeenCalledWith('user:user-valid-1');
      expect(client.emit).toHaveBeenCalledWith('connected', {
        status: 'CONNECTED',
        userId: 'user-valid-1',
        heartbeatIntervalMs: 5000,
        timestamp: expect.any(Number),
      });
      expect(redis.set).toHaveBeenCalledWith(
        'ws:session:user-valid-1',
        expect.stringContaining('socket-abc-123'),
        3600,
      );
    });

    it('should disconnect client immediately if no token is provided', async () => {
      const client = {
        id: 'socket-unauth',
        handshake: { auth: {}, headers: {} },
        disconnect: jest.fn(),
      } as any;

      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect & Mid-Match Grace Snapshot', () => {
    it('should trigger saveGraceSnapshot if client disconnects while in an active match', async () => {
      const client = {
        id: 'socket-active-match',
        data: {
          userId: 'user-in-match-1',
          activeMatch: {
            matchId: 'match-xyz',
            tournamentId: 'tourn-999',
            stageNumber: 2,
            level: 7,
            currentScore: 3450,
            lastSeq: 88,
            matchTicket: 'ticket-val',
          },
        },
      } as any;

      await gateway.handleDisconnect(client);

      expect(graceService.saveGraceSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: 'match-xyz',
          userId: 'user-in-match-1',
          tournamentId: 'tourn-999',
          stageNumber: 2,
          level: 7,
          currentScore: 3450,
        }),
      );
    });
  });

  describe('handleResumeMatch', () => {
    it('should emit match-resumed with preserved level and score when resumption succeeds', async () => {
      graceService.resumeSession.mockResolvedValue({
        resumed: true,
        snapshot: {
          matchId: 'match-xyz',
          tournamentId: 'tourn-999',
          stageNumber: 2,
          level: 7,
          currentScore: 3450,
          lastSeq: 88,
        },
      });

      const client = {
        id: 'socket-resuming',
        data: { userId: 'user-in-match-1' },
        join: jest.fn(),
        emit: jest.fn(),
      } as any;

      await gateway.handleResumeMatch(client, {
        matchId: 'match-xyz',
        matchTicket: 'ticket-val',
      });

      expect(client.join).toHaveBeenCalledWith('match:match-xyz');
      expect(client.emit).toHaveBeenCalledWith(
        'match-resumed',
        expect.objectContaining({
          matchId: 'match-xyz',
          level: 7,
          currentScore: 3450,
        }),
      );
    });
  });

  describe('broadcastStageResults', () => {
    it('should broadcast STAGE_RESULTS payload to room participants', () => {
      gateway.broadcastStageResults('tourn-1', 2, {
        survivedCount: 50,
        eliminatedCount: 50,
        nextStageStartsInSeconds: 60,
        topQualifiers: [{ userId: 'u1', score: 2500, rank: 1 }],
      });

      expect(gateway.server.to).toHaveBeenCalledWith('tournament:tourn-1');
    });
  });
});
