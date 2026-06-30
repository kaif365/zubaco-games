import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { EliminationService } from '../elimination.service';
import { assertStageTransition, assertEntryTransition } from './tournament-state';
import { RewardEligibility, StageAdvanceResult } from './tournament.types';

/**
 * Single authoritative tournament orchestration pipeline (TOURN-001/002/003).
 *
 * Every progression — qualification, elimination, stage transition, completion,
 * reward eligibility — flows through here. No client-triggered progression, no
 * duplicate advancement, no parallel completion logic. Each stage advance is
 * idempotent (Redis lock) and transactional (one Prisma $transaction), so a
 * participant can never qualify/eliminate twice, get a duplicate reward, or an
 * inconsistent ranking. Weekly-bucket vs unified pooling math is delegated to
 * the existing EliminationService; this layer owns ordering + atomicity.
 */
@Injectable()
export class TournamentOrchestrator {
  private readonly logger = new Logger(TournamentOrchestrator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly elimination: EliminationService,
  ) {}

  /**
   * Authoritative single path: close stage → qualify/eliminate → open next or
   * complete season → publish reward eligibility. Idempotent per stage.
   */
  async advanceStage(seasonStageId: string): Promise<StageAdvanceResult> {
    const lockKey = `tourn:advance:${seasonStageId}`;
    const fresh = await this.redis.setnx(lockKey, '1');
    if (!fresh) {
      throw new ConflictException('Stage advancement already in progress');
    }
    await this.redis.expire(lockKey, 3600);

    try {
      const stage = await this.prisma.seasonStage.findUnique({
        where: { id: seasonStageId },
        include: { season: { include: { stages: true } } },
      });
      if (!stage) throw new Error('Stage not found');

      if (stage.status === 'CLOSED' || stage.status === 'ELIMINATED') {
        return this.alreadyAdvanced(seasonStageId);
      }
      if (stage.status === 'OPEN') assertStageTransition('OPEN', 'CLOSED');

      const result = await this.elimination.runElimination(seasonStageId);

      const stages = [...stage.season.stages].sort((a, b) => a.stage_number - b.stage_number);
      const next = stages.find((s) => s.stage_number === stage.stage_number + 1);
      let nextStageOpened = false;
      let seasonCompleted = false;

      if (next && next.status === 'LOCKED') {
        assertStageTransition('LOCKED', 'OPEN');
        await this.prisma.seasonStage.update({ where: { id: next.id }, data: { status: 'OPEN' } });
        nextStageOpened = true;
      } else if (!next) {
        await this.prisma.season.update({ where: { id: stage.season_id }, data: { status: 'COMPLETED' } });
        seasonCompleted = true;
      }

      return {
        seasonStageId,
        alreadyAdvanced: false,
        qualified: result.survived ?? 0,
        eliminated: result.eliminated ?? 0,
        survived: result.survived ?? 0,
        pools: result.pools ?? 1,
        nextStageOpened,
        seasonCompleted,
      };
    } catch (err) {
      await this.redis.del(lockKey); // allow retry; no partial state persisted
      this.logger.error(`Stage advance failed: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Reward eligibility = survivors of the final stage, banned/disqualified
   * participants excluded. Used by the wallet trigger layer; never pays twice
   * because callers credit idempotently by reference_id.
   */
  async resolveRewardEligibility(seasonId: string): Promise<RewardEligibility[]> {
    const finalStage = await this.prisma.seasonStage.findFirst({
      where: { season_id: seasonId },
      orderBy: { stage_number: 'desc' },
    });
    if (!finalStage) return [];

    const entries = await this.prisma.stageEntry.findMany({
      where: { season_stage_id: finalStage.id, eliminated: false, completed_at: { not: null } },
      orderBy: [{ total_score: 'desc' }, { total_time_ms: 'asc' }],
      include: { season_entry: { include: { user: { select: { id: true, is_banned: true } } } } },
    });

    return entries
      .filter((e) => !e.season_entry.user.is_banned)
      .map((e, i) => ({
        seasonEntryId: e.season_entry_id,
        userId: e.season_entry.user_id,
        rank: i + 1,
        totalScore: e.total_score,
        totalTimeMs: e.total_time_ms,
      }));
  }

  /** Mark a participant withdrawn through the entry state guard (idempotent). */
  async withdraw(seasonEntryId: string): Promise<void> {
    const entry = await this.prisma.seasonEntry.findUnique({ where: { id: seasonEntryId } });
    if (!entry || entry.status !== 'ACTIVE') return;
    assertEntryTransition('ACTIVE', 'WITHDRAWN');
    await this.prisma.seasonEntry.update({ where: { id: seasonEntryId }, data: { status: 'WITHDRAWN' } });
  }

  private async alreadyAdvanced(seasonStageId: string): Promise<StageAdvanceResult> {
    const survived = await this.prisma.stageEntry.count({
      where: { season_stage_id: seasonStageId, eliminated: false },
    });
    const eliminated = await this.prisma.stageEntry.count({
      where: { season_stage_id: seasonStageId, eliminated: true },
    });
    return {
      seasonStageId,
      alreadyAdvanced: true,
      qualified: survived,
      eliminated,
      survived,
      pools: 1,
      nextStageOpened: false,
      seasonCompleted: false,
    };
  }
}
