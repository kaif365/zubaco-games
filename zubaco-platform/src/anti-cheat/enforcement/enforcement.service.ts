import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { LeaderboardService } from '../../leaderboard/leaderboard.service';
import { WebhookService } from '../../webhook/webhook.service';
import { EnforcementAction, EnforcementRequest, EnforcementResult } from './enforcement.types';

/**
 * Single authoritative enforcement engine. All DB mutations execute inside one
 * Prisma $transaction (all-or-nothing). External effects (Redis leaderboard
 * removal, wallet reversal trigger) run only AFTER commit, and the whole
 * operation is idempotent via a Redis lock so duplicate/concurrent/retried
 * enforcement cannot double-apply. Unconfirmed verdicts only mark-for-review.
 */
@Injectable()
export class EnforcementService {
  private readonly logger = new Logger(EnforcementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly leaderboard: LeaderboardService,
    private readonly webhook: WebhookService,
  ) {}

  async enforce(req: EnforcementRequest): Promise<EnforcementResult> {
    const lockKey = `acheat:enforce:${req.sessionId ?? req.userId}`;
    const fresh = await this.redis.setnx(lockKey, '1');
    if (!fresh) {
      return { enforced: false, alreadyEnforced: true, actionsApplied: [] };
    }
    await this.redis.expire(lockKey, 86400);

    try {
      const actions = req.confirmed ? req.actions : [EnforcementAction.MARK_FOR_REVIEW];
      const removals: Array<{ userId: string; gameType: any }> = [];

      await this.prisma.$transaction(async (tx) => {
        const session = req.sessionId
          ? await tx.gameSession.findUnique({ where: { id: req.sessionId } })
          : null;

        if (
          (actions.includes(EnforcementAction.INVALIDATE_SESSION) ||
            actions.includes(EnforcementAction.REJECT_COMPLETION)) &&
          req.sessionId
        ) {
          await tx.gameSession.updateMany({
            where: { id: req.sessionId },
            data: { outcome: 'DISQUALIFIED', score: 0, completed_at: new Date() },
          });
        }

        if (actions.includes(EnforcementAction.REMOVE_LEADERBOARD_SCORE) && session) {
          removals.push({ userId: session.user_id, gameType: session.game_type });
        }

        if (
          session?.stage_entry_id &&
          (actions.includes(EnforcementAction.REMOVE_TOURNAMENT_SCORE) ||
            actions.includes(EnforcementAction.REVOKE_RANKING) ||
            actions.includes(EnforcementAction.REMOVE_TOURNAMENT_QUALIFICATION))
        ) {
          await tx.stageEntry.updateMany({
            where: { id: session.stage_entry_id },
            data: {
              total_score: 0,
              rank: null,
              eliminated: actions.includes(EnforcementAction.REMOVE_TOURNAMENT_QUALIFICATION),
            },
          });
        }

        if (
          actions.includes(EnforcementAction.MARK_FOR_REVIEW) ||
          actions.includes(EnforcementAction.INVALIDATE_REWARDS)
        ) {
          await tx.user.update({
            where: { id: req.userId },
            data: req.confirmed
              ? { is_banned: true, ban_reason: req.reason }
              : { ban_reason: `REVIEW: ${req.reason}` },
          });
          await tx.refreshToken.deleteMany({ where: { user_id: req.userId } });
        }
      });

      // Post-commit external effects (idempotent; safe to repeat).
      for (const r of removals) await this.leaderboard.removeScore(r.userId, r.gameType);
      if (
        req.confirmed &&
        (req.actions.includes(EnforcementAction.PREVENT_WALLET_PAYOUT) ||
          req.actions.includes(EnforcementAction.REVERSE_PENDING_PAYOUT))
      ) {
        await this.webhook.emitEnforcementReversal({
          user_id: req.userId,
          session_id: req.sessionId ?? '',
          reason: req.reason,
        });
      }

      return { enforced: true, alreadyEnforced: false, actionsApplied: actions };
    } catch (err) {
      await this.redis.del(lockKey); // allow retry on failure (no partial state)
      this.logger.error(`Enforcement failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
