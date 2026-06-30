import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '.prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { OtpService } from '../auth/otp.service';
import { BankDetailService } from './bank-detail.service';
import { TdsService } from '../compliance/tds.service';
import { config } from '../config';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly otpService: OtpService,
    private readonly bankDetailService: BankDetailService,
    private readonly tdsService: TdsService,
  ) {}

  async getWallet(userId: string) {
    // Race-safe first-touch creation: two concurrent reads can no longer collide
    // on the unique user_id (P2002) — the upsert is atomic (WALLET-VAL-08).
    return this.prisma.wallet.upsert({
      where: { user_id: userId },
      create: { user_id: userId },
      update: {},
    });
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, skip, take: limit }),
      this.prisma.transaction.count({ where: { user_id: userId } }),
    ]);
    return { transactions, total, page, totalPages: Math.ceil(total / limit) };
  }

  async requestWithdrawal(userId: string, amount: number) {
    if (amount < config.app.minWithdrawal) throw new BadRequestException(`Minimum withdrawal is ₹${config.app.minWithdrawal}`);
    if (amount > 50000) throw new BadRequestException('Maximum withdrawal is ₹50,000 per transaction');

    // Daily limits: max 3 withdrawals, max ₹50,000 GROSS total per day. Only
    // settled/in-flight withdrawals consume the quota — FAILED/CANCELLED attempts
    // must not penalise the user (WALLET-VAL-07).
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayWithdrawals = await this.prisma.transaction.findMany({
      where: {
        user_id: userId,
        type: 'WITHDRAWAL',
        status: { in: ['PENDING', 'COMPLETED'] },
        created_at: { gte: todayStart },
      },
    });
    if (todayWithdrawals.length >= 3) {
      throw new BadRequestException('Maximum 3 withdrawals per day');
    }
    // The stored WITHDRAWAL amount is the GROSS debit (WALLET-VAL-06), so the cap
    // is enforced on gross as intended.
    const todayTotal = todayWithdrawals.reduce((sum, t) => sum + Number(t.amount), 0);
    if (todayTotal + amount > 50000) {
      throw new BadRequestException(`Daily withdrawal limit exceeded. Remaining today: ₹${50000 - todayTotal}`);
    }

    // Re-assert the 48h bank-change cooling period at debit time, not just at OTP
    // initiation, so a bank-detail change during the OTP window cannot slip a
    // payout through (WALLET-VAL-11).
    await this.bankDetailService.checkCoolingPeriod(userId);

    return this.prisma.$transaction(async (tx) => {
      // Lock the wallet row to prevent double-spend
      const [wallet] = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
        userId,
      );
      if (!wallet) throw new BadRequestException('Wallet not found');
      if (!wallet.kyc_verified) throw new BadRequestException('KYC verification required for withdrawals');

      const balance = new Prisma.Decimal(wallet.balance);
      const grossDec = new Prisma.Decimal(amount);
      if (balance.lessThan(grossDec)) throw new BadRequestException('Insufficient balance');

      // Calculate TDS
      const tds = await this.tdsService.calculateTds(userId, amount);
      const netPayout = tds.amountAfterTds;
      // The wallet is debited the GROSS amount; the WITHDRAWAL row records the GROSS
      // (so Σ ledger deltas == balance) and carries the net/tds breakdown in
      // metadata for the disbursement step (WALLET-VAL-06).
      const newBalance = balance.minus(grossDec);

      await tx.wallet.update({ where: { user_id: userId }, data: { balance: { decrement: grossDec } } });

      const txn = await tx.transaction.create({
        data: {
          user_id: userId,
          type: 'WITHDRAWAL',
          amount: grossDec,
          balance_after: newBalance,
          status: 'PENDING',
          description: `Withdrawal ₹${amount} (TDS ₹${tds.tdsOnThisWithdrawal}, net ₹${netPayout})`,
          metadata: { gross: amount, tds: tds.tdsOnThisWithdrawal, net: netPayout },
        },
      });

      // Record TDS if applicable (informational row — no further balance impact)
      if (tds.tdsOnThisWithdrawal > 0) {
        await tx.transaction.create({
          data: { user_id: userId, type: 'TDS_DEDUCTION', amount: tds.tdsOnThisWithdrawal, balance_after: newBalance, status: 'COMPLETED', description: `TDS 30% on net winnings`, reference_id: txn.id },
        });
      }

      return {
        new_balance: newBalance.toNumber(),
        withdrawal_amount: amount,
        tds_deducted: tds.tdsOnThisWithdrawal,
        net_payout: netPayout,
        status: 'PENDING',
      };
    });
  }

  /**
   * Transaction-aware entry-fee debit. Must be called inside an existing
   * interactive transaction so the debit is atomic with the caller's writes
   * (e.g. season-entry creation). Uses a row lock to prevent concurrent
   * balance races.
   */
  async deductEntryFeeTx(tx: Prisma.TransactionClient, userId: string, seasonId: string, amount: number) {
    const [wallet] = await tx.$queryRawUnsafe<any[]>(
      `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
      userId,
    );
    if (!wallet) throw new BadRequestException('Wallet not found');

    const balance = new Prisma.Decimal(wallet.balance);
    const bonus = new Prisma.Decimal(wallet.bonus_balance);
    const amountDec = new Prisma.Decimal(amount);
    if (balance.plus(bonus).lessThan(amountDec)) throw new BadRequestException('Insufficient balance for entry fee');

    // Bonus-first split; the exact cash/bonus breakdown is persisted in metadata so
    // a later refund can return funds to the correct buckets and reconciliation can
    // account for non-withdrawable bonus (WALLET-VAL-05/09).
    const fromBonus = Prisma.Decimal.min(bonus, amountDec);
    const fromBalance = amountDec.minus(fromBonus);
    const newBalance = balance.minus(fromBalance);
    const newBonus = bonus.minus(fromBonus);

    await tx.wallet.update({
      where: { user_id: userId },
      data: { balance: { decrement: fromBalance }, bonus_balance: { decrement: fromBonus } },
    });
    await tx.transaction.create({
      data: {
        user_id: userId,
        type: 'ENTRY_FEE',
        amount: amountDec,
        balance_after: newBalance.plus(newBonus),
        status: 'COMPLETED',
        reference_id: seasonId,
        description: 'Season entry fee',
        metadata: { from_balance: fromBalance.toNumber(), from_bonus: fromBonus.toNumber() },
      },
    });

    return { success: true };
  }

  /**
   * Refund a season entry fee (e.g. when a season is cancelled). Credited to the
   * withdrawable balance with a REFUND transaction record.
   */
  async refundEntryFee(userId: string, seasonId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      const [wallet] = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
        userId,
      );
      if (!wallet) throw new BadRequestException('Wallet not found');

      // Idempotency: a season entry fee is refunded at most once. A repeated cancel
      // must not double-credit (WALLET-VAL-02).
      const existingRefund = await tx.transaction.findFirst({
        where: { user_id: userId, type: 'REFUND', reference_id: seasonId, status: 'COMPLETED' },
      });
      if (existingRefund) {
        return { new_balance: new Prisma.Decimal(wallet.balance).toNumber(), already_refunded: true };
      }

      // Return funds to the same buckets they were drawn from so non-withdrawable
      // bonus is not silently converted into withdrawable cash (WALLET-VAL-09).
      const original = await tx.transaction.findFirst({
        where: { user_id: userId, type: 'ENTRY_FEE', reference_id: seasonId, status: 'COMPLETED' },
        orderBy: { created_at: 'desc' },
      });
      const amountDec = new Prisma.Decimal(amount);
      const meta = (original?.metadata as any) || {};
      let toBonus = original && meta.from_bonus != null ? new Prisma.Decimal(meta.from_bonus) : new Prisma.Decimal(0);
      // Never refund more to bonus than the amount being refunded.
      if (toBonus.greaterThan(amountDec)) toBonus = amountDec;
      const toBalance = amountDec.minus(toBonus);

      const newBalance = new Prisma.Decimal(wallet.balance).plus(toBalance);
      const newBonus = new Prisma.Decimal(wallet.bonus_balance).plus(toBonus);

      await tx.wallet.update({
        where: { user_id: userId },
        data: { balance: { increment: toBalance }, bonus_balance: { increment: toBonus } },
      });
      await tx.transaction.create({
        data: {
          user_id: userId,
          type: 'REFUND',
          amount: amountDec,
          balance_after: newBalance.plus(newBonus),
          status: 'COMPLETED',
          reference_id: seasonId,
          description: 'Season entry fee refund',
          metadata: { to_balance: toBalance.toNumber(), to_bonus: toBonus.toNumber() },
        },
      });

      return { new_balance: newBalance.toNumber() };
    });
  }

  async creditPrize(userId: string, amount: number, seasonId: string) {
    return this.prisma.$transaction(async (tx) => {
      const [wallet] = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
        userId,
      );
      if (!wallet) throw new BadRequestException('Wallet not found');

      // Idempotency under the wallet row lock: a given season prize is credited to a
      // given user at most once, so a re-run of prize distribution (e.g. a retried
      // scheduler pass) cannot double-pay (WALLET-VAL-02).
      const existing = await tx.transaction.findFirst({
        where: { user_id: userId, type: 'PRIZE_WIN', reference_id: seasonId, status: 'COMPLETED' },
      });
      if (existing) {
        return { new_balance: new Prisma.Decimal(wallet.balance).toNumber(), already_credited: true };
      }

      const amountDec = new Prisma.Decimal(amount);
      const newBalance = new Prisma.Decimal(wallet.balance).plus(amountDec);

      await tx.wallet.update({ where: { user_id: userId }, data: { balance: { increment: amountDec } } });
      await tx.transaction.create({
        data: { user_id: userId, type: 'PRIZE_WIN', amount: amountDec, balance_after: newBalance, status: 'COMPLETED', reference_id: seasonId, description: 'Tournament prize' },
      });

      return { new_balance: newBalance.toNumber() };
    });
  }

  async creditReferralBonus(userId: string, referralId: string) {
    return this.prisma.$transaction(async (tx) => {
      const [wallet] = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
        userId,
      );
      if (!wallet) throw new BadRequestException('Wallet not found');

      // Idempotency: one referral bonus per (user, referral) — a duplicate trigger
      // cannot double-credit (WALLET-VAL-02).
      const existing = await tx.transaction.findFirst({
        where: { user_id: userId, type: 'REFERRAL_BONUS', reference_id: referralId, status: 'COMPLETED' },
      });
      if (existing) return;

      const bonusAmount = new Prisma.Decimal(config.app.referralBonusAmount);
      const newBonus = new Prisma.Decimal(wallet.bonus_balance).plus(bonusAmount);

      await tx.wallet.update({ where: { user_id: userId }, data: { bonus_balance: { increment: bonusAmount } } });
      await tx.transaction.create({
        data: { user_id: userId, type: 'REFERRAL_BONUS', amount: bonusAmount, balance_after: new Prisma.Decimal(wallet.balance).plus(newBonus), status: 'COMPLETED', reference_id: referralId, description: 'Referral bonus' },
      });
    });
  }

  // ─── TWO-STEP WITHDRAWAL (OTP VERIFIED) ────────────────────────

  async initiateWithdrawal(userId: string, amount: number) {
    if (amount < config.app.minWithdrawal) throw new BadRequestException(`Minimum withdrawal is ₹${config.app.minWithdrawal}`);
    if (amount > 50000) throw new BadRequestException('Maximum withdrawal is ₹50,000 per transaction');

    // Daily limits check
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayWithdrawals = await this.prisma.transaction.findMany({
      where: { user_id: userId, type: 'WITHDRAWAL', created_at: { gte: todayStart } },
    });
    if (todayWithdrawals.length >= 3) {
      throw new BadRequestException('Maximum 3 withdrawals per day');
    }
    const todayTotal = todayWithdrawals.reduce((sum, t) => sum + Number(t.amount), 0);
    if (todayTotal + amount > 50000) {
      throw new BadRequestException(`Daily withdrawal limit exceeded. Remaining today: ₹${50000 - todayTotal}`);
    }

    // Bank detail cooling period check
    await this.bankDetailService.checkCoolingPeriod(userId);

    // Pre-check balance
    const wallet = await this.getWallet(userId);
    if (!wallet.kyc_verified) throw new BadRequestException('KYC verification required for withdrawals');
    if (Number(wallet.balance) < amount) throw new BadRequestException('Insufficient balance');

    // Get user phone for OTP
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!user?.phone) throw new BadRequestException('Phone number required for withdrawal verification');

    // Send OTP
    await this.otpService.generateAndSend(user.phone);

    // Store pending withdrawal intent in Redis (5 min TTL)
    const withdrawalId = `wd_${Date.now()}_${userId.slice(0, 8)}`;
    await this.redis.set(`withdrawal:${withdrawalId}`, JSON.stringify({ userId, amount }), 300);

    return { withdrawal_id: withdrawalId, message: 'OTP sent to your registered phone number' };
  }

  async confirmWithdrawal(userId: string, withdrawalId: string, otp: string) {
    // Retrieve pending intent
    const raw = await this.redis.get(`withdrawal:${withdrawalId}`);
    if (!raw) throw new BadRequestException('Withdrawal request expired. Please try again.');

    const intent = JSON.parse(raw) as { userId: string; amount: number };
    if (intent.userId !== userId) throw new BadRequestException('Invalid withdrawal request');

    // Verify OTP
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!user?.phone) throw new BadRequestException('Phone number required');

    const isValid = await this.otpService.verify(user.phone, otp);
    if (!isValid) throw new BadRequestException('Invalid OTP');

    // Delete Redis key (one-time use)
    await this.redis.del(`withdrawal:${withdrawalId}`);

    // Process actual withdrawal
    return this.requestWithdrawal(userId, intent.amount);
  }
}
