import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { WalletLedgerService } from './ledger/ledger.service';
import { EventBusService } from '../events/event-bus.service';
import { PlatformEventType } from '../events/event.types';

@Injectable()
export class WalletCleanupService {
  private readonly logger = new Logger(WalletCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: WalletLedgerService,
    private readonly events: EventBusService,
  ) {}

  /**
   * Every 30 minutes: expire abandoned PENDING deposit transactions older than
   * 30 minutes (abandoned checkout sessions). Each cancellation is routed through
   * the authoritative ledger (atomic PENDING -> CANCELLED claim, audited,
   * idempotent — a cancel that races a late settlement loses cleanly) and emits
   * a DEPOSIT_CANCELLED event.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async expireAbandonedDeposits() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const abandoned = await this.prisma.transaction.findMany({
      where: {
        type: 'DEPOSIT',
        status: 'PENDING',
        created_at: { lt: thirtyMinutesAgo },
      },
      select: { reference_id: true },
    });

    let cancelled = 0;
    for (const row of abandoned) {
      if (!row.reference_id) continue;
      const result = await this.ledger.cancelDeposit(row.reference_id, 'Abandoned checkout (expired)');
      if (result.applied) {
        cancelled++;
        await this.events.publish(
          PlatformEventType.DEPOSIT_CANCELLED,
          {
            reference_id: row.reference_id,
            amount: result.amount,
            transaction_id: result.transactionId,
            reason: 'abandoned',
          },
          result.userId,
          `deposit.cancelled:${row.reference_id}`,
        );
      }
    }

    if (cancelled > 0) {
      this.logger.log(`Expired ${cancelled} abandoned deposit(s)`);
    }
  }

  /**
   * Daily at 3 AM IST: reconcile wallet balances
   * Flag any user whose wallet.balance doesn't match transaction sum
   */
  @Cron('0 3 * * *', { timeZone: 'Asia/Kolkata' })
  async dailyReconciliation() {
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
      console.error(`[RECONCILIATION ALERT] ${discrepancies.length} wallet balance discrepancies found:`, discrepancies.slice(0, 5));
      // TODO: Send alert to monitoring/ops team
    }
  }
}
