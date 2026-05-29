import { Injectable, BadRequestException } from '@nestjs/common';
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

  async deposit(userId: string, amount: number, referenceId: string) {
    if (amount <= 0) throw new BadRequestException('Invalid amount');

    return this.prisma.$transaction(async (tx) => {
      // Lock the wallet row to prevent concurrent credits
      const [wallet] = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
        userId,
      );
      if (!wallet) throw new BadRequestException('Wallet not found');

      const newBalance = Number(wallet.balance) + amount;

      await tx.wallet.update({ where: { user_id: userId }, data: { balance: newBalance } });
      await tx.transaction.create({
        data: { user_id: userId, type: 'DEPOSIT', amount, balance_after: newBalance, status: 'COMPLETED', reference_id: referenceId, description: 'Wallet top-up' },
      });

      return { balance: newBalance, amount };
    });
  }

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

    return this.prisma.$transaction(async (tx) => {
      // Lock the wallet row to prevent double-spend
      const [wallet] = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
        userId,
      );
      if (!wallet) throw new BadRequestException('Wallet not found');
      if (!wallet.kyc_verified) throw new BadRequestException('KYC verification required for withdrawals');

      const balance = Number(wallet.balance);
      if (balance < amount) throw new BadRequestException('Insufficient balance');

      // Calculate TDS
      const tds = await this.tdsService.calculateTds(userId, amount);
      const netPayout = tds.amountAfterTds;
      const newBalance = balance - amount;

      await tx.wallet.update({ where: { user_id: userId }, data: { balance: newBalance } });

      const txn = await tx.transaction.create({
        data: { user_id: userId, type: 'WITHDRAWAL', amount: netPayout, balance_after: newBalance, status: 'PENDING', description: `Withdrawal ₹${amount} (TDS ₹${tds.tdsOnThisWithdrawal})` },
      });

      // Record TDS if applicable
      if (tds.tdsOnThisWithdrawal > 0) {
        await tx.transaction.create({
          data: { user_id: userId, type: 'TDS_DEDUCTION', amount: tds.tdsOnThisWithdrawal, balance_after: newBalance, status: 'COMPLETED', description: `TDS 30% on net winnings`, reference_id: txn.id },
        });
      }

      return {
        new_balance: newBalance,
        withdrawal_amount: amount,
        tds_deducted: tds.tdsOnThisWithdrawal,
        net_payout: netPayout,
        status: 'PENDING',
      };
    });
  }

  async deductEntryFee(userId: string, seasonId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      const [wallet] = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
        userId,
      );
      if (!wallet) throw new BadRequestException('Wallet not found');

      const balance = Number(wallet.balance);
      const bonus = Number(wallet.bonus_balance);
      if (balance + bonus < amount) throw new BadRequestException('Insufficient balance for entry fee');

      const deductFromBonus = Math.min(bonus, amount);
      const deductFromBalance = amount - deductFromBonus;
      const newBalance = balance - deductFromBalance;
      const newBonus = bonus - deductFromBonus;

      await tx.wallet.update({ where: { user_id: userId }, data: { balance: newBalance, bonus_balance: newBonus } });
      await tx.transaction.create({
        data: { user_id: userId, type: 'ENTRY_FEE', amount, balance_after: newBalance + newBonus, status: 'COMPLETED', reference_id: seasonId, description: 'Season entry fee' },
      });

      return { success: true };
    });
  }

  async creditPrize(userId: string, amount: number, seasonId: string) {
    return this.prisma.$transaction(async (tx) => {
      const [wallet] = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
        userId,
      );
      if (!wallet) throw new BadRequestException('Wallet not found');

      const newBalance = Number(wallet.balance) + amount;

      await tx.wallet.update({ where: { user_id: userId }, data: { balance: newBalance } });
      await tx.transaction.create({
        data: { user_id: userId, type: 'PRIZE_WIN', amount, balance_after: newBalance, status: 'COMPLETED', reference_id: seasonId, description: 'Tournament prize' },
      });

      return { new_balance: newBalance };
    });
  }

  async creditReferralBonus(userId: string, referralId: string) {
    return this.prisma.$transaction(async (tx) => {
      const [wallet] = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "wallets" WHERE "user_id" = $1 FOR UPDATE`,
        userId,
      );
      if (!wallet) throw new BadRequestException('Wallet not found');

      const bonusAmount = config.app.referralBonusAmount;
      const newBonus = Number(wallet.bonus_balance) + bonusAmount;

      await tx.wallet.update({ where: { user_id: userId }, data: { bonus_balance: newBonus } });
      await tx.transaction.create({
        data: { user_id: userId, type: 'REFERRAL_BONUS', amount: bonusAmount, balance_after: Number(wallet.balance) + newBonus, status: 'COMPLETED', reference_id: referralId, description: 'Referral bonus' },
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
