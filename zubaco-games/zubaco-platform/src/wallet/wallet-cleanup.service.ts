import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class WalletCleanupService {
  private readonly logger = new Logger(WalletCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Every 30 minutes: expire abandoned PENDING deposit transactions
   * older than 30 minutes. These represent abandoned checkout sessions.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async expireAbandonedDeposits() {
    if (!(await this.redis.acquireLock('lock:cron:expireAbandonedDeposits', 1700))) return;
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const result = await this.prisma.transaction.updateMany({
      where: {
        type: 'DEPOSIT',
        status: 'PENDING',
        created_at: { lt: thirtyMinutesAgo },
      },
      data: { status: 'CANCELLED' },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} abandoned deposit(s)`);
    }
  }

  /**
   * Daily at 3 AM IST: reconcile wallet balances.
   * Flag any user whose stored wallet total (withdrawable balance +
   * non-withdrawable bonus) doesn't match the ledger.
   */
  @Cron('0 3 * * *', { timeZone: 'Asia/Kolkata' })
  async dailyReconciliation() {
    if (!(await this.redis.acquireLock('lock:cron:dailyReconciliation', 3600))) return;
    const wallets = await this.prisma.wallet.findMany({
      select: { user_id: true, balance: true, bonus_balance: true },
    });

    // One grouped aggregate over the whole ledger instead of two queries per
    // wallet (WALLET-VAL-13).
    const grouped = await this.prisma.transaction.groupBy({
      by: ['user_id', 'type', 'status'],
      _sum: { amount: true },
    });

    // Reconcile the COMBINED wallet total (balance + bonus_balance): every credit
    // or debit moves the combined wallet by its full amount, so no cash/bonus
    // split is needed. Credits = DEPOSIT / PRIZE_WIN / REFUND / REFERRAL_BONUS
    // (COMPLETED). Debits = ENTRY_FEE (COMPLETED) + WITHDRAWAL (any status — the
    // balance is debited at request time and re-credited by an explicit REFUND on
    // payout failure). TDS_DEDUCTION and GST are informational (no balance delta)
    // and are excluded (WALLET-VAL-05).
    const expectedByUser = new Map<string, number>();
    for (const g of grouped) {
      const sum = Number(g._sum.amount || 0);
      if (sum === 0) continue;
      let delta = 0;
      if (
        g.status === 'COMPLETED' &&
        (g.type === 'DEPOSIT' || g.type === 'PRIZE_WIN' || g.type === 'REFUND' || g.type === 'REFERRAL_BONUS')
      ) {
        delta = sum;
      } else if (g.type === 'ENTRY_FEE' && g.status === 'COMPLETED') {
        delta = -sum;
      } else if (g.type === 'WITHDRAWAL') {
        delta = -sum;
      }
      if (delta !== 0) {
        expectedByUser.set(g.user_id, (expectedByUser.get(g.user_id) || 0) + delta);
      }
    }

    const discrepancies: { userId: string; expected: number; actual: number }[] = [];
    for (const wallet of wallets) {
      const expected = expectedByUser.get(wallet.user_id) || 0;
      const actual = Number(wallet.balance) + Number(wallet.bonus_balance);

      // Allow small floating point difference
      if (Math.abs(expected - actual) > 0.01) {
        discrepancies.push({ userId: wallet.user_id, expected, actual });
      }
    }

    if (discrepancies.length > 0) {
      this.logger.error(
        `[RECONCILIATION ALERT] ${discrepancies.length} wallet balance discrepancies found: ` +
          JSON.stringify(discrepancies.slice(0, 5)),
      );
    }
  }
}
