import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { PaymentGatewayService } from './payment-gateway.service';

/**
 * Authoritative withdrawal disbursement runtime (M1).
 *
 * The withdrawal request path (`confirmWithdrawal` -> `requestWithdrawal` ->
 * `WalletLedgerService.createPendingWithdrawal`) debits the wallet and leaves a
 * PENDING WITHDRAWAL row. This worker is the single live trigger that drives
 * those PENDING rows to settlement: it calls `PaymentGatewayService.processWithdrawal`,
 * which executes the RazorpayX payout and then either:
 *   - `completeWithdrawal()` (PENDING -> COMPLETED) + PAYOUT_SETTLED, or
 *   - `failWithdrawal()`     (PENDING -> FAILED, refunded) + PAYOUT_REVERSED.
 *
 * Duplicate payout execution is prevented by a per-transaction Redis lock; a
 * successful or failed payout immediately moves the row out of PENDING, so it is
 * never re-picked. Settlement/reversal themselves are idempotent in the ledger
 * (the PENDING claim is the guard), so the runtime is safe to retry.
 */
@Injectable()
export class WithdrawalDisbursementService {
  private readonly logger = new Logger(WithdrawalDisbursementService.name);

  /** Per-transaction lock guarding against duplicate payout execution. */
  private static readonly LOCK_PREFIX = 'withdrawal:disburse:lock:';
  /** Lock TTL — comfortably longer than a RazorpayX payout round-trip. */
  private static readonly LOCK_TTL_SECONDS = 300;
  /** Run-level lock preventing overlapping batches if one tick runs long. */
  private static readonly RUN_LOCK = 'withdrawal:disburse:run';
  private static readonly RUN_LOCK_TTL_SECONDS = 55;
  /** Max PENDING withdrawals processed per tick. */
  private static readonly BATCH_SIZE = 20;
  /** Only disburse rows that have settled in the DB for a few seconds. */
  private static readonly MIN_AGE_MS = 5000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly paymentGateway: PaymentGatewayService,
  ) {}

  /**
   * Every minute: disburse PENDING withdrawals. Idempotent and concurrency-safe.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async disbursePendingWithdrawals(): Promise<void> {
    // Run-level guard: skip if another tick is still draining the batch.
    const gotRun = await this.redis.setnx(WithdrawalDisbursementService.RUN_LOCK, String(Date.now()));
    if (!gotRun) return;
    await this.redis.expire(
      WithdrawalDisbursementService.RUN_LOCK,
      WithdrawalDisbursementService.RUN_LOCK_TTL_SECONDS,
    );

    try {
      const cutoff = new Date(Date.now() - WithdrawalDisbursementService.MIN_AGE_MS);
      const pending = await this.prisma.transaction.findMany({
        where: { type: 'WITHDRAWAL', status: 'PENDING', created_at: { lt: cutoff } },
        orderBy: { created_at: 'asc' },
        take: WithdrawalDisbursementService.BATCH_SIZE,
        select: { id: true },
      });

      for (const txn of pending) {
        await this.disburseOne(txn.id);
      }
    } catch (err) {
      this.logger.error(`Withdrawal disbursement batch failed: ${(err as Error).message}`);
    } finally {
      await this.redis.del(WithdrawalDisbursementService.RUN_LOCK);
    }
  }

  /**
   * Disburse a single PENDING withdrawal under a per-transaction lock. The lock
   * is the authoritative guard against duplicate payout execution; the payout +
   * settlement/reversal + event publication all happen inside
   * `processWithdrawal`, which is idempotent at the ledger boundary.
   */
  private async disburseOne(transactionId: string): Promise<void> {
    const lockKey = `${WithdrawalDisbursementService.LOCK_PREFIX}${transactionId}`;
    const acquired = await this.redis.setnx(lockKey, String(Date.now()));
    if (!acquired) {
      // Another worker/tick is already disbursing this withdrawal.
      return;
    }
    await this.redis.expire(lockKey, WithdrawalDisbursementService.LOCK_TTL_SECONDS);

    try {
      await this.paymentGateway.processWithdrawal(transactionId);
      this.logger.log(`Withdrawal ${transactionId} disbursed (settled).`);
    } catch (err) {
      // processWithdrawal already reversed/refunded (and emitted PAYOUT_REVERSED)
      // when the payout itself failed. A pre-payout guard failure (e.g. no
      // verified bank detail) leaves the row PENDING for a later retry.
      this.logger.warn(`Withdrawal ${transactionId} not settled this tick: ${(err as Error).message}`);
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
