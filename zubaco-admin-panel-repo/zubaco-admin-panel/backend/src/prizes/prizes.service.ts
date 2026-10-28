import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

interface PrizeDistribution {
  user_id: string;
  amount: number;
  rank: number;
}

@Injectable()
export class PrizesService {
  constructor(private readonly prisma: PrismaService) {}

  async distribute(seasonId: string, distributions: PrizeDistribution[]) {
    const results: Array<{ user_id: string; amount: number; rank: number; wallet_balance: any; transaction_id: string; idempotent: boolean }> = [];

    for (const dist of distributions) {
      if (dist.amount <= 0) {
        throw new BadRequestException('Prize amount must be positive');
      }

      const referenceId = `prize:${seasonId}:${dist.rank}:${dist.user_id}`;

      const result = await this.prisma.$transaction(async (tx) => {
        // Idempotency: a re-run for the same season/rank/user cannot double-credit.
        const existing = await tx.transaction.findFirst({
          where: { type: 'PRIZE_WIN', reference_id: referenceId },
        });
        if (existing) {
          const w = await tx.wallet.findUnique({ where: { user_id: dist.user_id } });
          const bal = w ? Number(w.balance) + Number(w.bonus_balance) : Number(existing.balance_after);
          return { wallet_balance: bal, transaction_id: existing.id, idempotent: true };
        }

        const wallet = await tx.wallet.update({
          where: { user_id: dist.user_id },
          data: { balance: { increment: dist.amount } },
        });

        const transaction = await tx.transaction.create({
          data: {
            user_id: dist.user_id,
            type: 'PRIZE_WIN',
            amount: dist.amount,
            balance_after: Number(wallet.balance) + Number(wallet.bonus_balance),
            status: 'COMPLETED',
            reference_id: referenceId,
            metadata: {
              season_id: seasonId,
              rank: dist.rank,
            },
          },
        });

        return {
          wallet_balance: Number(wallet.balance) + Number(wallet.bonus_balance),
          transaction_id: transaction.id,
          idempotent: false,
        };
      });

      results.push({
        user_id: dist.user_id,
        amount: dist.amount,
        rank: dist.rank,
        wallet_balance: result.wallet_balance,
        transaction_id: result.transaction_id,
        idempotent: result.idempotent,
      });
    }

    return { season_id: seasonId, distributions: results };
  }

  async getSeasonDistributions(seasonId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        type: 'PRIZE_WIN',
        metadata: { path: ['season_id'], equals: seasonId },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        user_id: true,
        amount: true,
        metadata: true,
        created_at: true,
      },
    });

    return { season_id: seasonId, distributions: transactions };
  }
}
