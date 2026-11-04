import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { TournamentGateway } from '../../ws/tournament.gateway';
import { EliminationService } from '../elimination.service';
import { RewardPayoutService } from './reward-payout.service';
import { TournamentOrchestrator } from './tournament.orchestrator';
import {
  TournamentLifecycleState,
  assertLifecycleTransition,
  getNextLifecycleState,
  MANDATORY_INTERMISSION_REST_SECONDS,
  getStageNumberFromState,
} from './stage-lifecycle';

export interface StageTallyResult {
  tournamentId: string;
  stageNumber: number;
  totalParticipants: number;
  survivedCount: number;
  eliminatedCount: number;
  nextState: TournamentLifecycleState;
  intermissionRestSeconds: number;
}

@Injectable()
export class TournamentStageEngineService {
  private readonly logger = new Logger(TournamentStageEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly wsGateway: TournamentGateway,
    private readonly eliminationService: EliminationService,
    private readonly rewardPayout: RewardPayoutService,
    private readonly orchestrator: TournamentOrchestrator,
  ) {}

  /**
   * Retrieve current lifecycle state from Redis cache or database.
   */
  async getCurrentState(tournamentId: string): Promise<TournamentLifecycleState> {
    const cached = await this.redis.get(`tourn:state:${tournamentId}`);
    if (cached && Object.values(TournamentLifecycleState).includes(cached as TournamentLifecycleState)) {
      return cached as TournamentLifecycleState;
    }

    const season = await this.prisma.season.findUnique({
      where: { id: tournamentId },
      include: { stages: { orderBy: { stage_number: 'asc' } } },
    });

    if (!season) {
      throw new Error(`Tournament ${tournamentId} not found`);
    }

    // Default mapping if not yet tracked in fine-grained state machine
    if (season.status === 'UPCOMING') return TournamentLifecycleState.DRAFT;
    if (season.status === 'REGISTRATION') return TournamentLifecycleState.REGISTRATION_OPEN;
    if (season.status === 'COMPLETED') return TournamentLifecycleState.ARCHIVED;
    if (season.status === 'CANCELLED') return TournamentLifecycleState.CANCELLED;

    const activeStage = season.stages.find((s) => s.status === 'OPEN');
    if (activeStage) {
      return `STAGE_${activeStage.stage_number}_LIVE` as TournamentLifecycleState;
    }

    return TournamentLifecycleState.STAGE_1_LIVE;
  }

  /**
   * Idempotently advance tournament to target lifecycle state.
   */
  async transitionState(
    tournamentId: string,
    targetState: TournamentLifecycleState,
  ): Promise<TournamentLifecycleState> {
    const lockKey = `tourn:lock:${tournamentId}`;
    const acquired = await this.redis.acquireLock(lockKey, 30);
    if (!acquired) {
      throw new ConflictException(`Tournament ${tournamentId} transition is currently locked by another worker`);
    }

    try {
      const currentState = await this.getCurrentState(tournamentId);

      if (currentState === targetState) {
        return currentState;
      }

      assertLifecycleTransition(currentState, targetState);

      // Save state to Redis
      await this.redis.set(`tourn:state:${tournamentId}`, targetState);

      // Broadcast state transition to tournament room
      this.wsGateway.broadcastToTournament(tournamentId, 'TOURNAMENT_STATE_TRANSITION', {
        tournamentId,
        previousState: currentState,
        newState: targetState,
        timestamp: Date.now(),
      });

      this.logger.log(`Tournament ${tournamentId} transitioned: ${currentState} -> ${targetState}`);
      return targetState;
    } finally {
      await this.redis.releaseLock(lockKey);
    }
  }

  /**
   * Execute stage tally:
   * 1. Transitions to STAGE_X_TALLY
   * 2. Ranks participants and eliminates bottom percentile
   * 3. Broadcasts STAGE_RESULTS via WebSocket
   * 4. Enforces mandatory 60-second intermission countdown
   */
  async executeStageTally(
    tournamentId: string,
    seasonStageId: string,
    stageNumber: number,
  ): Promise<StageTallyResult> {
    const tallyState = `STAGE_${stageNumber}_TALLY` as TournamentLifecycleState;
    await this.transitionState(tournamentId, tallyState);

    // Run elimination math
    const result = await this.eliminationService.runElimination(seasonStageId);
    const totalParticipants = (result.survived ?? 0) + (result.eliminated ?? 0);

    // Query top qualifiers for broadcast
    const topEntries = await this.prisma.stageEntry.findMany({
      where: { season_stage_id: seasonStageId, eliminated: false },
      orderBy: [{ total_score: 'desc' }, { total_time_ms: 'asc' }],
      take: 10,
      select: { user_id: true, total_score: true, rank: true },
    });

    const topQualifiers = topEntries.map((e) => ({
      userId: e.user_id,
      score: e.total_score,
      rank: e.rank ?? 0,
    }));

    // Broadcast STAGE_RESULTS over WebSocket to room
    this.wsGateway.broadcastStageResults(tournamentId, stageNumber, {
      survivedCount: result.survived ?? 0,
      eliminatedCount: result.eliminated ?? 0,
      nextStageStartsInSeconds: MANDATORY_INTERMISSION_REST_SECONDS,
      topQualifiers,
    });

    // Set 60-second intermission rest timer in Redis
    const restKey = `tourn:rest:${tournamentId}:stage:${stageNumber}`;
    await this.redis.set(restKey, 'active', MANDATORY_INTERMISSION_REST_SECONDS);

    const nextState =
      stageNumber < 5
        ? (`STAGE_${stageNumber + 1}_LIVE` as TournamentLifecycleState)
        : TournamentLifecycleState.PRIZE_CALCULATION;

    return {
      tournamentId,
      stageNumber,
      totalParticipants,
      survivedCount: result.survived ?? 0,
      eliminatedCount: result.eliminated ?? 0,
      nextState,
      intermissionRestSeconds: MANDATORY_INTERMISSION_REST_SECONDS,
    };
  }

  /**
   * Finalize tournament prizes and archive season.
   */
  async finalizeAndDistributePrizes(tournamentId: string): Promise<void> {
    await this.transitionState(tournamentId, TournamentLifecycleState.PRIZE_CALCULATION);

    // Update database status to COMPLETED so distributeRewards passes authoritative gate
    await this.prisma.season.update({
      where: { id: tournamentId },
      data: { status: 'COMPLETED' },
    });

    try {
      const winners = await this.orchestrator.resolveRewardEligibility(tournamentId);
      await this.rewardPayout.distributeRewards(tournamentId, winners);
    } catch (err) {
      this.logger.error(`Prize distribution failed for tournament ${tournamentId}:`, err);
    }

    await this.transitionState(tournamentId, TournamentLifecycleState.PRIZE_DISTRIBUTED);
    await this.transitionState(tournamentId, TournamentLifecycleState.ARCHIVED);

    this.logger.log(`Tournament ${tournamentId} successfully finalized, rewards distributed, and ARCHIVED.`);
  }
}
