import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { OtpService } from '../auth/otp.service';
import { BankDetailService } from './bank-detail.service';
import { TdsService } from '../compliance/tds.service';
import { WalletLedgerService } from './ledger/ledger.service';
import { FinancialOperation } from './ledger/ledger.types';
import { config } from '../config';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly otpService: OtpService,
    private readonly bankDetailService: BankDetailService,
    private readonly tdsService: TdsService,
    private readonly ledger: WalletLedgerService,
  ) {}

  async getWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await this.prisma.wallet.create({ data: { user_id: userId } });
    }
    return wallet;
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, skip, take: limit }),
      this.prisma.transaction.count({ where: { user_id: userId } }),
    ]);
    return { transactions, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * NOTE (M9): the former generic `deposit()` top-up adapter was removed. It had
   * no live caller — the authoritative deposit runtime is the Razorpay order flow
   * (`PaymentGatewayService.createDepositOrder` -> `WalletLedgerService`
   * createPendingDeposit -> settleDeposit), which is idempotent, fully audited and
   * the single source of deposit credits. No dormant deposit runtime remains.
   */

  async requestWithdrawal(userId: string, amount: number) {
    if (amount < config.app.minWithdrawal) throw new BadRequestException(`Minimum withdrawal is ₹${config.app.minWithdrawal}`);
    if (amount > 50000) throw new BadRequestException('Maximum withdrawal is ₹50,000 per transaction');

    // Daily limits: max 3 withdrawals, max ₹50,000 total per day
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

    // Calculate TDS
    const tds = await this.tdsService.calculateTds(userId, amount);
    const netPayout = tds.amountAfterTds;

    // Authoritative debit + PENDING row via the wallet ledger. KYC and balance
    // checks are enforced inside the row-locked ledger transaction; the gross
    // amount leaves the balance, the WITHDRAWAL row carries the net payout, and
    // TDS is recorded separately — identical rows to the legacy implementation.
    const result = await this.ledger.createPendingWithdrawal({
      userId,
      grossAmount: amount,
      netPayout,
      tdsAmount: tds.tdsOnThisWithdrawal,
      idempotencyKey: `withdrawal:${randomUUID()}`,
      reason: `Withdrawal ₹${amount} (TDS ₹${tds.tdsOnThisWithdrawal})`,
    });

    return {
      new_balance: result.balanceAfter,
      withdrawal_amount: amount,
      tds_deducted: tds.tdsOnThisWithdrawal,
      net_payout: netPayout,
      status: 'PENDING',
    };
  }

  /**
   * Season entry-fee debit. Routed through the authoritative wallet ledger
   * (`WalletLedgerService.debitEntryFee`), which preserves the legacy rule
   * exactly — bonus bucket spent first, then cash — and writes a single
   * `ENTRY_FEE` row, now idempotent (per season+user) and audited. Thin
   * compatibility adapter: signature, return shape and the insufficient-balance
   * error contract are unchanged.
   */
  async deductEntryFee(userId: string, seasonId: string, amount: number) {
    await this.ledger.debitEntryFee({
      userId,
      amount,
      idempotencyKey: `entryfee:${seasonId}:${userId}`,
      reason: 'Season entry fee',
      seasonRef: seasonId,
    });
    return { success: true };
  }

  /**
   * Tournament prize credit. Routed through the authoritative wallet ledger
   * (`WalletLedgerService.post`) so every reward/payout shares one idempotent,
   * row-locked, fully-audited money pipeline. Idempotency is keyed per
   * season+user, so a retried or duplicated payout cannot double-credit.
   * This method is now a thin compatibility adapter that preserves the legacy
   * signature, the `PRIZE_WIN` transaction type and the cash bucket (keeping
   * the daily reconciliation invariant intact).
   */
  async creditPrize(userId: string, amount: number, seasonId: string) {
    const result = await this.ledger.post({
      userId,
      operation: FinancialOperation.TOURNAMENT_PAYOUT,
      amount,
      idempotencyKey: `prize:${seasonId}:${userId}`,
      reason: 'Tournament prize',
      bucket: 'cash',
      tournamentRef: seasonId,
      source: 'tournament:prize',
    });
    // `applied`/`duplicate` surface the ledger's at-most-once outcome so the
    // prize payout runtime credits + notifies each winner exactly once.
    return {
      new_balance: result.balanceAfter,
      applied: result.applied,
      duplicate: result.duplicate,
      transaction_id: result.transactionId,
    };
  }

  /**
   * Referral bonus credit (bonus bucket). Routed through the authoritative wallet
   * ledger (`WalletLedgerService.post`, REFERRAL_CREDIT -> REFERRAL_BONUS type,
   * bonus bucket) so it shares the one idempotent, audited money pipeline. The
   * idempotency key is per referral+user, so the referrer and the referred user
   * each receive their bonus exactly once even if the referral flow retries.
   * Thin compatibility adapter (unchanged signature).
   */
  async creditReferralBonus(userId: string, referralId: string) {
    const bonusAmount = config.app.referralBonusAmount;
    if (!bonusAmount || bonusAmount <= 0) return;
    await this.ledger.post({
      userId,
      operation: FinancialOperation.REFERRAL_CREDIT,
      amount: bonusAmount,
      idempotencyKey: `referral:${referralId}:${userId}`,
      reason: 'Referral bonus',
      bucket: 'bonus',
      source: 'social:referral',
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
