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
   * Daily at 3 AM IST: reconcile wallet balances
   * Flag any user whose wallet.balance doesn't match transaction sum
   */
  @Cron('0 3 * * *', { timeZone: 'Asia/Kolkata' })
  async dailyReconciliation() {
    if (!(await this.redis.acquireLock('lock:cron:dailyReconciliation', 3600))) return;
    const wallets = await this.prisma.wallet.findMany({
      select: { user_id: true, balance: true, bonus_balance: true },
    });

    const discrepancies: { userId: string; expected: number; actual: number }[] = [];

    for (const wallet of wallets) {
      const deposits = await this.prisma.transaction.aggregate({
        where: { user_id: wallet.user_id, status: 'COMPLETED', type: { in: ['DEPOSIT', 'PRIZE_WIN', 'REFUND'] } },
        _sum: { amount: true },
      });

      const debits = await this.prisma.transaction.aggregate({
        where: { user_id: wallet.user_id, status: { in: ['COMPLETED', 'PENDING'] }, type: { in: ['WITHDRAWAL', 'ENTRY_FEE'] } },
        _sum: { amount: true },
      });

      const expectedBalance = Number(deposits._sum.amount || 0) - Number(debits._sum.amount || 0);
      const actualBalance = Number(wallet.balance);

      // Allow small floating point difference
      if (Math.abs(expectedBalance - actualBalance) > 0.01) {
        discrepancies.push({ userId: wallet.user_id, expected: expectedBalance, actual: actualBalance });
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
