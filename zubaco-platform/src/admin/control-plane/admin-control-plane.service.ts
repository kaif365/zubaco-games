import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { TournamentOrchestrator } from '../../tournament/orchestration/tournament.orchestrator';
import { RewardPayoutService } from '../../tournament/orchestration/reward-payout.service';
import { WalletLedgerService } from '../../wallet/ledger/ledger.service';
import { FinancialOperation } from '../../wallet/ledger/ledger.types';
import { EnforcementService } from '../../anti-cheat/enforcement/enforcement.service';
import { EnforcementAction } from '../../anti-cheat/enforcement/enforcement.types';
import { EventBusService } from '../../events/event-bus.service';
import { PlatformEventType } from '../../events/event.types';
import {
  AdminAction,
  AdminAuditEntry,
  AdminCommand,
  AdminContext,
  AdminResult,
  ROLE_PERMISSIONS,
} from './admin.types';

/**
 * Single authoritative entry point for every admin operation. RBAC-gated,
 * idempotent, immutably audited, and delegates to the platform pipelines —
 * never a direct real-money table write. Legacy admin callers route through
 * this service as their compatibility adapter.
 */
@Injectable()
export class AdminControlPlaneService {
  private readonly logger = new Logger(AdminControlPlaneService.name);
  private readonly AUDIT = 'admin:audit';

  constructor(
    private readonly redis: RedisService,
    private readonly tournaments: TournamentOrchestrator,
    private readonly rewardPayout: RewardPayoutService,
    private readonly ledger: WalletLedgerService,
    private readonly enforcement: EnforcementService,
    private readonly events: EventBusService,
  ) {}

  async execute(ctx: AdminContext, cmd: AdminCommand): Promise<AdminResult> {
    if (!ROLE_PERMISSIONS[ctx.role]?.has(cmd.action)) {
      await this.audit(ctx, cmd, 'DENIED');
      throw new ForbiddenException(`Role ${ctx.role} may not perform ${cmd.action}`);
    }

    const lockKey = `admin:req:${cmd.requestId}`;
    const fresh = await this.redis.setnx(lockKey, '1');
    if (!fresh) {
      await this.audit(ctx, cmd, 'DUPLICATE');
      return { ok: true, duplicate: true, outcome: 'DUPLICATE' };
    }
    await this.redis.expire(lockKey, 7 * 24 * 3600);

    try {
      const data = await this.dispatch(ctx, cmd);
      await this.audit(ctx, cmd, 'OK');
      return { ok: true, duplicate: false, outcome: 'OK', data };
    } catch (err) {
      await this.redis.del(lockKey); // safe retry
      await this.audit(ctx, cmd, 'ERROR');
      this.logger.error(`Admin ${cmd.action} failed: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Read-only view of the immutable audit trail (most-recent first). Pure
   * projection of the append-only Redis zset — never mutates state.
   */
  async getAuditTrail(limit = 50): Promise<AdminAuditEntry[]> {
    const safeLimit = Math.min(Math.max(1, Math.trunc(limit) || 0), 500);
    const raw = await this.redis.zrevrange(this.AUDIT, 0, safeLimit - 1);
    const entries: AdminAuditEntry[] = [];
    for (const item of raw) {
      try {
        entries.push(JSON.parse(item) as AdminAuditEntry);
      } catch {
        this.logger.warn('Skipping malformed audit entry');
      }
    }
    return entries;
  }

  private async dispatch(ctx: AdminContext, cmd: AdminCommand): Promise<unknown> {
    const p = cmd.params ?? {};
    switch (cmd.action) {
      case AdminAction.ADVANCE_STAGE:
        return this.tournaments.advanceStage(cmd.target);
      case AdminAction.RESOLVE_REWARDS:
        return this.tournaments.resolveRewardEligibility(cmd.target);
      case AdminAction.DISTRIBUTE_REWARDS: {
        // Manual retry of the prize payout (e.g. if the automatic post-completion
        // run was interrupted). Reuses the authoritative eligibility resolution
        // and the idempotent ledger payout, so it can never double-pay.
        const winners = await this.tournaments.resolveRewardEligibility(cmd.target);
        return this.rewardPayout.distributeRewards(cmd.target, winners);
      }
      case AdminAction.CREDIT_WALLET: {
        const res = await this.ledger.post({
          userId: cmd.target,
          operation: FinancialOperation.ADJUSTMENT,
          amount: Number(p.amount ?? 0),
          idempotencyKey: cmd.requestId,
          reason: cmd.reason,
          source: `admin:${ctx.adminId}`,
        });
        await this.events.publish(PlatformEventType.WALLET_CREDITED, { user_id: cmd.target }, cmd.target, cmd.requestId);
        return res;
      }
      case AdminAction.REVERSE_PAYOUT:
        return this.ledger.post({
          userId: cmd.target,
          operation: FinancialOperation.PAYOUT_REVERSAL,
          amount: Number(p.amount ?? 0),
          idempotencyKey: cmd.requestId,
          reason: cmd.reason,
          source: `admin:${ctx.adminId}`,
        });
      case AdminAction.ENFORCE_ANTI_CHEAT:
        return this.enforcement.enforce({
          userId: cmd.target,
          sessionId: p.sessionId as string | undefined,
          reason: cmd.reason,
          actions: (p.actions as EnforcementAction[]) ?? [EnforcementAction.MARK_FOR_REVIEW],
          confirmed: true,
          enforcedBy: ctx.adminId,
        });
      case AdminAction.MARK_FOR_REVIEW:
        return this.enforcement.enforce({
          userId: cmd.target,
          reason: cmd.reason,
          actions: [EnforcementAction.MARK_FOR_REVIEW],
          confirmed: false,
          enforcedBy: ctx.adminId,
        });
    }
  }

  /** Append-only immutable audit trail (Redis list, never updated/deleted). */
  private async audit(ctx: AdminContext, cmd: AdminCommand, outcome: AdminAuditEntry['outcome']): Promise<void> {
    const entry: AdminAuditEntry = {
      requestId: cmd.requestId,
      adminId: ctx.adminId,
      role: ctx.role,
      action: cmd.action,
      target: cmd.target,
      reason: cmd.reason,
      outcome,
      at: new Date().toISOString(),
    };
    try {
      await this.redis.zadd(this.AUDIT, Date.now(), JSON.stringify(entry));
    } catch {
      this.logger.error(`Audit write failed for ${cmd.requestId}`);
    }
  }
}
