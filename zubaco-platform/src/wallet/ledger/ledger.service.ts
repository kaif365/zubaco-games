import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, TransactionType } from '.prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { FinancialOperation, LedgerRequest, LedgerResult, WalletBucket } from './ledger.types';

const CREDIT_OPS = new Set<FinancialOperation>([
  FinancialOperation.REWARD_CREDIT,
  FinancialOperation.TOURNAMENT_PAYOUT,
  FinancialOperation.PAYOUT_REVERSAL,
  FinancialOperation.REFUND,
]);

function txType(op: FinancialOperation, amount: number): TransactionType {
  switch (op) {
    case FinancialOperation.REWARD_CREDIT:
    case FinancialOperation.TOURNAMENT_PAYOUT:
      return 'PRIZE_WIN';
    case FinancialOperation.PENDING_PAYOUT:
    case FinancialOperation.PAYOUT_SETTLEMENT:
      return 'WITHDRAWAL';
    case FinancialOperation.PAYOUT_REVERSAL:
    case FinancialOperation.REFUND:
      return 'REFUND';
    case FinancialOperation.ADJUSTMENT:
      return amount >= 0 ? 'DEPOSIT' : 'WITHDRAWAL';
  }
}

/**
 * The single authoritative wallet engine. Every reward, payout, reversal,
 * refund, adjustment and settlement passes through `post()`. Existing
 * WalletService methods are retained as compatibility adapters.
 */
@Injectable()
export class WalletLedgerService {
  private readonly logger = new Logger(WalletLedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async post(req: LedgerRequest): Promise<LedgerResult> {
    if (!req.idempotencyKey) throw new BadRequestException('idempotencyKey required');
    if (req.amount <= 0) throw new BadRequestException('amount must be positive');

    const lockKey = `wallet:ledger:${req.idempotencyKey}`;
    const fresh = await this.redis.setnx(lockKey, '1');
    if (!fresh) throw new ConflictException('Operation already in progress');
    await this.redis.expire(lockKey, 86400);

    try {
      // Idempotent: a prior committed row with this key short-circuits.
      const existing = await this.prisma.transaction.findFirst({
        where: { user_id: req.userId, reference_id: req.idempotencyKey, status: 'COMPLETED' },
      });
      if (existing) {
        return {
          transactionId: existing.id,
          applied: false,
          duplicate: true,
          balanceAfter: Number(existing.balance_after),
        };
      }

      const isCredit = CREDIT_OPS.has(req.operation) || req.amount >= 0;
      const bucket: WalletBucket = req.bucket ?? 'cash';
      const amt = new Prisma.Decimal(req.amount);

      const result = await this.prisma.$transaction(async (tx) => {
        const [w] = await tx.$queryRawUnsafe<any[]>(
          `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
          req.userId,
        );
        if (!w) throw new BadRequestException('Wallet not found');

        const cash = new Prisma.Decimal(w.balance);
        const bonus = new Prisma.Decimal(w.bonus_balance);
        const target = bucket === 'bonus' ? bonus : cash;
        const next = isCredit ? target.add(amt) : target.sub(amt);
        if (next.lessThan(0)) throw new BadRequestException('Insufficient balance');

        await tx.wallet.update({
          where: { user_id: req.userId },
          data: bucket === 'bonus' ? { bonus_balance: next } : { balance: next },
        });

        const balanceAfter = (bucket === 'bonus' ? cash : next).add(bucket === 'bonus' ? next : bonus);
        const created = await tx.transaction.create({
          data: {
            user_id: req.userId,
            type: txType(req.operation, isCredit ? req.amount : -req.amount),
            amount: amt,
            balance_after: balanceAfter,
            status: 'COMPLETED',
            reference_id: req.idempotencyKey,
            description: req.reason,
            metadata: {
              _ledger: {
                operation: req.operation,
                source: req.source ?? null,
                destination: req.destination ?? null,
                reason: req.reason,
                bucket,
                verification_ref: req.verificationRef ?? null,
                tournament_ref: req.tournamentRef ?? null,
                enforcement_ref: req.enforcementRef ?? null,
                at: new Date().toISOString(),
              },
            },
          },
        });
        return { id: created.id, balanceAfter: Number(balanceAfter) };
      });

      return { transactionId: result.id, applied: true, duplicate: false, balanceAfter: result.balanceAfter };
    } catch (err) {
      await this.redis.del(lockKey); // no partial state committed → safe retry
      this.logger.error(`Ledger post failed (${req.operation}): ${(err as Error).message}`);
      throw err;
    }
  }

  /** Mark an existing PENDING withdrawal as settled (idempotent). */
  async settlePending(transactionId: string): Promise<void> {
    await this.prisma.transaction.updateMany({
      where: { id: transactionId, status: 'PENDING', type: 'WITHDRAWAL' },
      data: { status: 'COMPLETED' },
    });
  }
}
