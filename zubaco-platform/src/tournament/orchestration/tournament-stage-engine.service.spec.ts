import { Test, TestingModule } from '@nestjs/testing';
import { TournamentStageEngineService } from './tournament-stage-engine.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { TournamentGateway } from '../../ws/tournament.gateway';
import { EliminationService } from '../elimination.service';
import { RewardPayoutService } from './reward-payout.service';
import { TournamentOrchestrator } from './tournament.orchestrator';
import { TournamentLifecycleState } from './stage-lifecycle';

describe('TournamentStageEngineService (Module 5.2 Certification)', () => {
  let service: TournamentStageEngineService;
  let prisma: {
    season: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    stageEntry: {
      findMany: jest.Mock;
    };
  };
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    acquireLock: jest.Mock;
    releaseLock: jest.Mock;
  };
  let wsGateway: {
    broadcastStageResults: jest.Mock;
    broadcastToTournament: jest.Mock;
  };
  let eliminationService: {
    runElimination: jest.Mock;
  };
  let rewardPayout: {
    distributeRewards: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      season: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      stageEntry: {
        findMany: jest.fn().mockResolvedValue([
          { user_id: 'user-1', total_score: 3000, rank: 1 },
          { user_id: 'user-2', total_score: 2800, rank: 2 },
        ]),
      },
    };

    redis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(undefined),
    };

    wsGateway = {
      broadcastStageResults: jest.fn(),
      broadcastToTournament: jest.fn(),
    };

    eliminationService = {
      runElimination: jest.fn().mockResolvedValue({
        survived: 50,
        eliminated: 50,
      }),
    };

    rewardPayout = {
      distributeRewards: jest.fn().mockResolvedValue(undefined),
    };

    const orchestrator = {
      resolveRewardEligibility: jest.fn().mockResolvedValue([
        { seasonEntryId: 'se-1', userId: 'user-1', rank: 1, totalScore: 3000, totalTimeMs: 12000 },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentStageEngineService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: TournamentGateway, useValue: wsGateway },
        { provide: EliminationService, useValue: eliminationService },
        { provide: RewardPayoutService, useValue: rewardPayout },
        { provide: TournamentOrchestrator, useValue: orchestrator },
      ],
    }).compile();

    service = module.get<TournamentStageEngineService>(TournamentStageEngineService);
  });

  describe('transitionState', () => {
    it('should acquire distributed lock and update Redis state cleanly', async () => {
      redis.get.mockResolvedValue(TournamentLifecycleState.STAGE_1_LIVE);

      const next = await service.transitionState(
        'tourn-101',
        TournamentLifecycleState.STAGE_1_TALLY,
      );

      expect(next).toBe(TournamentLifecycleState.STAGE_1_TALLY);
      expect(redis.acquireLock).toHaveBeenCalledWith('tourn:lock:tourn-101', 30);
      expect(redis.set).toHaveBeenCalledWith(
        'tourn:state:tourn-101',
        TournamentLifecycleState.STAGE_1_TALLY,
      );
      expect(wsGateway.broadcastToTournament).toHaveBeenCalledWith(
        'tourn-101',
        'TOURNAMENT_STATE_TRANSITION',
        expect.objectContaining({
          previousState: TournamentLifecycleState.STAGE_1_LIVE,
          newState: TournamentLifecycleState.STAGE_1_TALLY,
        }),
      );
      expect(redis.releaseLock).toHaveBeenCalledWith('tourn:lock:tourn-101');
    });

    it('should throw ConflictException if lock is already held', async () => {
      redis.acquireLock.mockResolvedValue(false);

      await expect(
        service.transitionState('tourn-101', TournamentLifecycleState.STAGE_1_TALLY),
      ).rejects.toThrow('currently locked by another worker');
    });
  });

  describe('executeStageTally', () => {
    it('should transition to tally state, run elimination, broadcast STAGE_RESULTS and set 60s rest timer', async () => {
      redis.get.mockResolvedValue(TournamentLifecycleState.STAGE_1_LIVE);

      const tallyResult = await service.executeStageTally('tourn-101', 'stage-1-id', 1);

      expect(tallyResult.stageNumber).toBe(1);
      expect(tallyResult.survivedCount).toBe(50);
      expect(tallyResult.eliminatedCount).toBe(50);
      expect(tallyResult.intermissionRestSeconds).toBe(60);
      expect(tallyResult.nextState).toBe(TournamentLifecycleState.STAGE_2_LIVE);

      expect(eliminationService.runElimination).toHaveBeenCalledWith('stage-1-id');

      // Verify WebSocket broadcast
      expect(wsGateway.broadcastStageResults).toHaveBeenCalledWith(
        'tourn-101',
        1,
        expect.objectContaining({
          survivedCount: 50,
          eliminatedCount: 50,
          nextStageStartsInSeconds: 60,
          topQualifiers: expect.arrayContaining([
            expect.objectContaining({ userId: 'user-1', score: 3000, rank: 1 }),
          ]),
        }),
      );

      // Verify 60-second intermission timer set in Redis
      expect(redis.set).toHaveBeenCalledWith(
        'tourn:rest:tourn-101:stage:1',
        'active',
        60,
      );
    });
  });

  describe('finalizeAndDistributePrizes', () => {
    it('should complete final stages, distribute rewards, and archive season', async () => {
      redis.get
        .mockResolvedValueOnce(TournamentLifecycleState.STAGE_5_TALLY)
        .mockResolvedValueOnce(TournamentLifecycleState.PRIZE_CALCULATION)
        .mockResolvedValueOnce(TournamentLifecycleState.PRIZE_DISTRIBUTED);

      await service.finalizeAndDistributePrizes('tourn-101');

      expect(rewardPayout.distributeRewards).toHaveBeenCalledWith(
        'tourn-101',
        expect.arrayContaining([
          expect.objectContaining({ userId: 'user-1', rank: 1, totalScore: 3000 }),
        ]),
      );
      expect(prisma.season.update).toHaveBeenCalledWith({
        where: { id: 'tourn-101' },
        data: { status: 'COMPLETED' },
      });
    });
  });
});
