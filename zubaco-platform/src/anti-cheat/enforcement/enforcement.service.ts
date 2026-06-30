import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { LeaderboardService } from '../../leaderboard/leaderboard.service';
import { WebhookService } from '../../webhook/webhook.service';
import { EventBusService } from '../../events/event-bus.service';
import { PlatformEventType } from '../../events/event.types';
import { EnforcementAction, EnforcementRequest, EnforcementResult, ReversalRequest, ReversalResult } from './enforcement.types';

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
    private readonly events: EventBusService,
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

      // M8 — proactively flip the authoritative auth ban cache so the ban takes
      // effect on the NEXT authenticated request (no wait for refresh expiry).
      // The DB `is_banned` column remains the source of truth; this only makes
      // the JWT strategy's fast-path see the ban immediately. '1' == banned.
      const banApplied =
        req.confirmed &&
        (actions.includes(EnforcementAction.MARK_FOR_REVIEW) ||
          actions.includes(EnforcementAction.INVALIDATE_REWARDS));
      if (banApplied) {
        await this.redis.set(`auth:ban:${req.userId}`, '1', 60);
      }
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

      // Post-commit authoritative event. Idempotent: the enforce Redis lock
      // blocks re-entry and the deterministic event id dedupes at the bus.
      const eventKey = req.sessionId ?? req.userId;
      if (req.confirmed) {
        await this.events.publish(
          PlatformEventType.ANTI_CHEAT_ENFORCED,
          { user_id: req.userId, session_id: req.sessionId ?? null, reason: req.reason, actions },
          req.userId,
          `anticheat.enforced:${eventKey}`,
        );
      } else {
        await this.events.publish(
          PlatformEventType.ACCOUNT_REVIEWED,
          { user_id: req.userId, session_id: req.sessionId ?? null, reason: req.reason },
          req.userId,
          `account.reviewed:${eventKey}`,
        );
      }

      return { enforced: true, alreadyEnforced: false, actionsApplied: actions };
    } catch (err) {
      await this.redis.del(lockKey); // allow retry on failure (no partial state)
      this.logger.error(`Enforcement failed: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Authoritative enforcement reversal (un-ban) — the counterpart to enforce().
   *
   * The ban reversal is written inside one Prisma $transaction (all-or-nothing)
   * and is the ONLY runtime that clears is_banned; no direct mutation remains.
   * Idempotent: a Redis lock guards against concurrent/duplicate reversals and
   * the state transition is naturally idempotent (clearing an already-clear ban
   * is a no-op). A post-commit ACCOUNT_RESTORED event provides the durable audit
   * trail, published only on a real banned -> not-banned transition and deduped
   * at the bus by a deterministic id — mirroring enforce()'s event model.
   */
  async reverse(req: ReversalRequest): Promise<ReversalResult> {
    const lockKey = `acheat:reverse:${req.userId}`;
    const fresh = await this.redis.setnx(lockKey, '1');
    if (!fresh) {
      // A concurrent reversal for the same user is already in flight.
      return { reversed: false, alreadyReversed: true, transitioned: false };
    }
    await this.redis.expire(lockKey, 300);

    try {
      const transitioned = await this.prisma.$transaction(async (tx) => {
        const current = await tx.user.findUnique({
          where: { id: req.userId },
          select: { is_banned: true },
        });
        if (!current) throw new Error(`User ${req.userId} not found`);
        await tx.user.update({
          where: { id: req.userId },
          data: { is_banned: false, ban_reason: null },
        });
        return current.is_banned;
      });

      // Post-commit authoritative audit event. Idempotent: the reverse lock
      // blocks re-entry and the deterministic event id dedupes at the bus.
      if (transitioned) {
        await this.events.publish(
          PlatformEventType.ACCOUNT_RESTORED,
          { user_id: req.userId, reason: req.reason, reversed_by: req.reversedBy ?? null },
          req.userId,
          `account.restored:${req.userId}`,
        );
      }

      // M8 — clear the authoritative auth ban cache so the un-ban is honoured
      // on the next authenticated request. '0' == not banned (DB is source of
      // truth; this only refreshes the JWT strategy's fast-path).
      await this.redis.set(`auth:ban:${req.userId}`, '0', 60);

      return { reversed: true, alreadyReversed: false, transitioned };
    } finally {
      // Release the concurrency guard; the DB transition is naturally idempotent,
      // so a later legitimate re-ban / un-ban cycle is never permanently blocked.
      await this.redis.del(lockKey);
    }
  }
}
