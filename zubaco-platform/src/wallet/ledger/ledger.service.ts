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
  FinancialOperation.REFERRAL_CREDIT,
  FinancialOperation.DEPOSIT_CREDIT,
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
    case FinancialOperation.REFERRAL_CREDIT:
      return 'REFERRAL_BONUS';
    case FinancialOperation.ENTRY_FEE_DEBIT:
      return 'ENTRY_FEE';
    case FinancialOperation.DEPOSIT_CREDIT:
      return 'DEPOSIT';
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
      // Idempotent: a prior row carrying this ledger key short-circuits. This is
      // a storage-level guarantee (the UNIQUE ledger_key index), not only Redis.
      const existing = await this.prisma.transaction.findFirst({
        where: { ledger_key: req.idempotencyKey },
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
            ledger_key: req.idempotencyKey,
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
      // Storage-level idempotency: a concurrent writer that won the UNIQUE
      // ledger_key race already committed the row; treat as duplicate, not failure.
      if ((err as any)?.code === 'P2002') {
        const dup = await this.prisma.transaction.findFirst({ where: { ledger_key: req.idempotencyKey } });
        if (dup) {
          return { transactionId: dup.id, applied: false, duplicate: true, balanceAfter: Number(dup.balance_after) };
        }
      }
      await this.redis.del(lockKey); // no partial state committed → safe retry
      this.logger.error(`Ledger post failed (${req.operation}): ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Season entry-fee debit. The legacy business rule (spend the bonus bucket
   * first, then cash, and record ONE `ENTRY_FEE` row carrying the combined
   * balance_after) cannot be expressed by the single-bucket `post()`, so it has
   * its own ledger method here — still the authoritative money path, sharing the
   * same Redis lock + UNIQUE ledger_key idempotency + immutable audit trail.
   */
  async debitEntryFee(req: {
    userId: string;
    amount: number;
    idempotencyKey: string;
    reason: string;
    seasonRef?: string;
  }): Promise<LedgerResult> {
    if (!req.idempotencyKey) throw new BadRequestException('idempotencyKey required');
    if (req.amount <= 0) throw new BadRequestException('amount must be positive');

    const lockKey = `wallet:ledger:${req.idempotencyKey}`;
    const fresh = await this.redis.setnx(lockKey, '1');
    if (!fresh) throw new ConflictException('Operation already in progress');
    await this.redis.expire(lockKey, 86400);

    try {
      const existing = await this.prisma.transaction.findFirst({ where: { ledger_key: req.idempotencyKey } });
      if (existing) {
        return {
          transactionId: existing.id,
          applied: false,
          duplicate: true,
          balanceAfter: Number(existing.balance_after),
        };
      }

      const amt = new Prisma.Decimal(req.amount);
      const result = await this.prisma.$transaction(async (tx) => {
        const [w] = await tx.$queryRawUnsafe<any[]>(
          `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
          req.userId,
        );
        if (!w) throw new BadRequestException('Wallet not found');

        const cash = new Prisma.Decimal(w.balance);
        const bonus = new Prisma.Decimal(w.bonus_balance);
        if (cash.add(bonus).lessThan(amt)) throw new BadRequestException('Insufficient balance for entry fee');

        // Bonus bucket spent first, then cash (legacy rule, preserved exactly).
        const fromBonus = bonus.lessThan(amt) ? bonus : amt;
        const fromCash = amt.sub(fromBonus);
        const newBonus = bonus.sub(fromBonus);
        const newCash = cash.sub(fromCash);

        await tx.wallet.update({
          where: { user_id: req.userId },
          data: { balance: newCash, bonus_balance: newBonus },
        });

        const balanceAfter = newCash.add(newBonus);
        const created = await tx.transaction.create({
          data: {
            user_id: req.userId,
            type: 'ENTRY_FEE',
            amount: amt,
            balance_after: balanceAfter,
            status: 'COMPLETED',
            reference_id: req.seasonRef ?? req.idempotencyKey,
            ledger_key: req.idempotencyKey,
            description: req.reason,
            metadata: {
              _ledger: {
                operation: FinancialOperation.ENTRY_FEE_DEBIT,
                source: 'wallet:bonus+cash',
                destination: 'tournament:entry',
                reason: req.reason,
                bucket: 'split',
                from_bonus: Number(fromBonus),
                from_cash: Number(fromCash),
                tournament_ref: req.seasonRef ?? null,
                at: new Date().toISOString(),
              },
            },
          },
        });
        return { id: created.id, balanceAfter: Number(balanceAfter) };
      });

      return { transactionId: result.id, applied: true, duplicate: false, balanceAfter: result.balanceAfter };
    } catch (err) {
      if ((err as any)?.code === 'P2002') {
        const dup = await this.prisma.transaction.findFirst({ where: { ledger_key: req.idempotencyKey } });
        if (dup) {
          return { transactionId: dup.id, applied: false, duplicate: true, balanceAfter: Number(dup.balance_after) };
        }
      }
      await this.redis.del(lockKey);
      this.logger.error(`Entry-fee debit failed: ${(err as Error).message}`);
      throw err;
    }
  }

  // ─── DEPOSIT LIFECYCLE ────────────────────────────────────────

  /**
   * Register the authoritative PENDING deposit row for a Razorpay order. This is
   * the single entry point of the deposit lifecycle (no direct transaction write
   * remains in the gateway). The row carries a stable ledger_key
   * (`deposit:pending:<referenceId>`) so a retried order registration collapses
   * onto the same PENDING row — guarded by the Redis lock and the UNIQUE
   * ledger_key index — instead of creating duplicates. No balance movement
   * happens here; the credit is applied later by settleDeposit. An immutable
   * _ledger audit block records the pending registration.
   */
  async createPendingDeposit(req: {
    userId: string;
    amount: number;
    referenceId: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ transactionId: string; applied: boolean; duplicate: boolean }> {
    if (req.amount <= 0) throw new BadRequestException('amount must be positive');
    const ledgerKey = `deposit:pending:${req.referenceId}`;

    const lockKey = `wallet:ledger:${ledgerKey}`;
    const fresh = await this.redis.setnx(lockKey, '1');
    if (!fresh) throw new ConflictException('Deposit registration already in progress');
    await this.redis.expire(lockKey, 86400);

    try {
      // Idempotent on the order id across the WHOLE lifecycle: a row already
      // exists (PENDING, COMPLETED, FAILED or CANCELLED) for this order → no new
      // PENDING row is created (covers the post-settlement re-registration case,
      // where settleDeposit has rewritten the ledger_key to `deposit:<ref>`).
      const existing = await this.prisma.transaction.findFirst({
        where: { reference_id: req.referenceId, type: 'DEPOSIT' },
      });
      if (existing) {
        return { transactionId: existing.id, applied: false, duplicate: true };
      }

      const wallet = await this.prisma.wallet.findUnique({ where: { user_id: req.userId } });
      const currentBalance = wallet ? Number(wallet.balance) : 0;

      const created = await this.prisma.transaction.create({
        data: {
          user_id: req.userId,
          type: 'DEPOSIT',
          amount: new Prisma.Decimal(req.amount),
          balance_after: new Prisma.Decimal(currentBalance),
          status: 'PENDING',
          reference_id: req.referenceId,
          ledger_key: ledgerKey,
          description: `Deposit ₹${req.amount}`,
          metadata: {
            ...(req.metadata ?? {}),
            _ledger: {
              operation: FinancialOperation.DEPOSIT_CREDIT,
              source: 'razorpay:order',
              destination: 'wallet:cash',
              reason: 'Deposit registered (pending)',
              bucket: 'cash',
              reference_id: req.referenceId,
              status: 'PENDING',
              at: new Date().toISOString(),
            },
          },
        },
      });
      return { transactionId: created.id, applied: true, duplicate: false };
    } catch (err) {
      if ((err as any)?.code === 'P2002') {
        const dup = await this.prisma.transaction.findFirst({ where: { ledger_key: ledgerKey } });
        if (dup) return { transactionId: dup.id, applied: false, duplicate: true };
      }
      await this.redis.del(lockKey);
      this.logger.error(`Pending deposit registration failed: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Authoritatively fail a PENDING deposit (gateway reported payment.failed). The
   * PENDING -> FAILED claim is atomic and is the idempotency guard, so a repeated
   * webhook is a no-op. No balance movement (the deposit was never credited). An
   * immutable audit block is written; the caller publishes DEPOSIT_FAILED.
   */
  async failDeposit(
    referenceId: string,
    reason: string,
  ): Promise<{ applied: boolean; transactionId?: string; userId?: string; amount?: number }> {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.transaction.updateMany({
        where: { reference_id: referenceId, status: 'PENDING', type: 'DEPOSIT' },
        data: { status: 'FAILED' },
      });
      if (claim.count === 0) return { applied: false };

      const row = await tx.transaction.findFirst({ where: { reference_id: referenceId, type: 'DEPOSIT' } });
      if (!row) return { applied: false };

      await tx.transaction.update({
        where: { id: row.id },
        data: {
          metadata: {
            ...((row.metadata as any) ?? {}),
            _ledger_failure: {
              operation: FinancialOperation.DEPOSIT_CREDIT,
              status: 'FAILED',
              reason,
              at: new Date().toISOString(),
            },
          },
        },
      });
      return { applied: true, transactionId: row.id, userId: row.user_id, amount: Number(row.amount) };
    });
  }

  /**
   * Authoritatively cancel an abandoned PENDING deposit (checkout never
   * completed). The PENDING -> CANCELLED claim is atomic and idempotent, so a
   * cancel that races a late settlement loses cleanly (claim.count === 0). No
   * balance movement. An immutable audit block is written; the caller publishes
   * DEPOSIT_CANCELLED.
   */
  async cancelDeposit(
    referenceId: string,
    reason: string,
  ): Promise<{ applied: boolean; transactionId?: string; userId?: string; amount?: number }> {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.transaction.updateMany({
        where: { reference_id: referenceId, status: 'PENDING', type: 'DEPOSIT' },
        data: { status: 'CANCELLED' },
      });
      if (claim.count === 0) return { applied: false };

      const row = await tx.transaction.findFirst({ where: { reference_id: referenceId, type: 'DEPOSIT' } });
      if (!row) return { applied: false };

      await tx.transaction.update({
        where: { id: row.id },
        data: {
          metadata: {
            ...((row.metadata as any) ?? {}),
            _ledger_cancellation: {
              operation: FinancialOperation.DEPOSIT_CREDIT,
              status: 'CANCELLED',
              reason,
              at: new Date().toISOString(),
            },
          },
        },
      });
      return { applied: true, transactionId: row.id, userId: row.user_id, amount: Number(row.amount) };
    });
  }

  /**
   * Settle a pre-created PENDING deposit row (Razorpay order). The row is
   * claimed atomically (PENDING -> COMPLETED, single writer) so a webhook and a
   * verify call cannot double-credit; the claim is the authoritative idempotency
   * guard. On the winning claim the wallet cash bucket is credited inside the
   * same transaction and the immutable _ledger audit block is written onto the
   * settled row. Returns duplicate=true (no credit) when the row was already
   * settled, cancelled, or never existed.
   */
  async settleDeposit(
    referenceId: string,
    paymentId?: string,
  ): Promise<{
    applied: boolean;
    duplicate: boolean;
    transactionId?: string;
    userId?: string;
    amount?: number;
    balanceAfter?: number;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.transaction.updateMany({
        where: { reference_id: referenceId, status: 'PENDING', type: 'DEPOSIT' },
        data: { status: 'COMPLETED' },
      });
      if (claim.count === 0) {
        return { applied: false, duplicate: true };
      }

      const row = await tx.transaction.findFirst({
        where: { reference_id: referenceId, type: 'DEPOSIT' },
      });
      if (!row) throw new BadRequestException('Deposit transaction not found');

      const [w] = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
        row.user_id,
      );
      const prevCash = w ? new Prisma.Decimal(w.balance) : new Prisma.Decimal(0);
      const bonus = w ? new Prisma.Decimal(w.bonus_balance) : new Prisma.Decimal(0);
      const newCash = prevCash.add(new Prisma.Decimal(row.amount));

      if (w) {
        await tx.wallet.update({ where: { user_id: row.user_id }, data: { balance: newCash } });
      } else {
        await tx.wallet.create({ data: { user_id: row.user_id, balance: newCash } });
      }

      const balanceAfter = newCash.add(bonus);
      await tx.transaction.update({
        where: { id: row.id },
        data: {
          balance_after: balanceAfter,
          ledger_key: `deposit:${referenceId}`,
          metadata: {
            ...((row.metadata as any) ?? {}),
            razorpay_payment_id: paymentId ?? ((row.metadata as any)?.razorpay_payment_id ?? null),
            _ledger: {
              operation: FinancialOperation.DEPOSIT_CREDIT,
              source: 'razorpay:deposit',
              destination: 'wallet:cash',
              reason: 'Deposit settlement',
              bucket: 'cash',
              reference_id: referenceId,
              at: new Date().toISOString(),
            },
          },
        },
      });

      return {
        applied: true,
        duplicate: false,
        transactionId: row.id,
        userId: row.user_id,
        amount: Number(row.amount),
        balanceAfter: Number(balanceAfter),
      };
    });
  }

  // ─── WITHDRAWAL LIFECYCLE ─────────────────────────────────────

  /**
   * Create a PENDING withdrawal: debit the cash bucket immediately (funds are
   * reserved while the external payout is in flight) and record the PENDING
   * WITHDRAWAL row plus the optional TDS_DEDUCTION row, in one row-locked
   * transaction with an immutable audit trail. Business rule preserved exactly:
   * the gross amount leaves the balance, the WITHDRAWAL row carries the net
   * payout, and TDS is recorded as a separate COMPLETED row.
   */
  async createPendingWithdrawal(req: {
    userId: string;
    grossAmount: number;
    netPayout: number;
    tdsAmount: number;
    idempotencyKey: string;
    reason: string;
  }): Promise<{ transactionId: string; balanceAfter: number }> {
    return this.prisma.$transaction(async (tx) => {
      const [w] = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
        req.userId,
      );
      if (!w) throw new BadRequestException('Wallet not found');
      if (!w.kyc_verified) throw new BadRequestException('KYC verification required for withdrawals');

      const cash = new Prisma.Decimal(w.balance);
      const gross = new Prisma.Decimal(req.grossAmount);
      if (cash.lessThan(gross)) throw new BadRequestException('Insufficient balance');

      const newCash = cash.sub(gross);
      await tx.wallet.update({ where: { user_id: req.userId }, data: { balance: newCash } });

      const txn = await tx.transaction.create({
        data: {
          user_id: req.userId,
          type: 'WITHDRAWAL',
          amount: new Prisma.Decimal(req.netPayout),
          balance_after: newCash,
          status: 'PENDING',
          ledger_key: req.idempotencyKey,
          description: req.reason,
          metadata: {
            _ledger: {
              operation: FinancialOperation.PENDING_PAYOUT,
              source: 'wallet:cash',
              destination: 'bank:payout',
              reason: req.reason,
              bucket: 'cash',
              gross_amount: req.grossAmount,
              net_payout: req.netPayout,
              tds_amount: req.tdsAmount,
              at: new Date().toISOString(),
            },
          },
        },
      });

      if (req.tdsAmount > 0) {
        await tx.transaction.create({
          data: {
            user_id: req.userId,
            type: 'TDS_DEDUCTION',
            amount: new Prisma.Decimal(req.tdsAmount),
            balance_after: newCash,
            status: 'COMPLETED',
            reference_id: txn.id,
            description: 'TDS 30% on net winnings',
          },
        });
      }

      return { transactionId: txn.id, balanceAfter: Number(newCash) };
    });
  }

  /**
   * Settle a PENDING withdrawal as COMPLETED after a successful external payout.
   * No balance movement (the debit happened at PENDING creation). The PENDING ->
   * COMPLETED claim is the idempotency guard, so a retried settlement is a no-op.
   */
  async completeWithdrawal(
    transactionId: string,
    payout: { payoutId?: string; payoutStatus?: string },
  ): Promise<{ applied: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.transaction.findFirst({ where: { id: transactionId, type: 'WITHDRAWAL' } });
      if (!row) throw new BadRequestException('Withdrawal transaction not found');

      const claim = await tx.transaction.updateMany({
        where: { id: transactionId, status: 'PENDING', type: 'WITHDRAWAL' },
        data: { status: 'COMPLETED' },
      });
      if (claim.count === 0) return { applied: false };

      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          metadata: {
            ...((row.metadata as any) ?? {}),
            payout_id: payout.payoutId ?? null,
            payout_status: payout.payoutStatus ?? null,
            _settlement: {
              operation: FinancialOperation.PAYOUT_SETTLEMENT,
              at: new Date().toISOString(),
            },
          },
        },
      });
      return { applied: true };
    });
  }

  /**
   * Reverse a PENDING withdrawal after a failed external payout: mark FAILED and
   * refund the net payout back to the cash bucket (mirrors the legacy refund
   * exactly). The PENDING -> FAILED claim guards against a double refund.
   */
  async failWithdrawal(transactionId: string, errorMessage: string): Promise<{ applied: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.transaction.findFirst({ where: { id: transactionId, type: 'WITHDRAWAL' } });
      if (!row) throw new BadRequestException('Withdrawal transaction not found');

      const claim = await tx.transaction.updateMany({
        where: { id: transactionId, status: 'PENDING', type: 'WITHDRAWAL' },
        data: { status: 'FAILED' },
      });
      if (claim.count === 0) return { applied: false };

      const [w] = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
        row.user_id,
      );
      if (!w) throw new BadRequestException('Wallet not found');
      const newCash = new Prisma.Decimal(w.balance).add(new Prisma.Decimal(row.amount));
      await tx.wallet.update({ where: { user_id: row.user_id }, data: { balance: newCash } });

      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          metadata: {
            ...((row.metadata as any) ?? {}),
            error: errorMessage,
            _reversal: {
              operation: FinancialOperation.PAYOUT_REVERSAL,
              refunded: Number(row.amount),
              at: new Date().toISOString(),
            },
          },
        },
      });
      return { applied: true };
    });
  }

  /** Mark an existing PENDING withdrawal as settled (idempotent). */
  async settlePending(transactionId: string): Promise<void> {
    await this.prisma.transaction.updateMany({
      where: { id: transactionId, status: 'PENDING', type: 'WITHDRAWAL' },
      data: { status: 'COMPLETED' },
    });
  }
}
