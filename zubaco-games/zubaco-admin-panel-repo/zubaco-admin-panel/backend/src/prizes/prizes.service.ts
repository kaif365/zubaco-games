import { Injectable } from '@nestjs/common';
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
    const results: Array<{ user_id: string; amount: number; rank: number; wallet_balance: any; transaction_id: string }> = [];

    for (const dist of distributions) {
      const wallet = await this.prisma.wallet.update({
        where: { user_id: dist.user_id },
        data: { balance: { increment: dist.amount } },
      });

      const transaction = await this.prisma.transaction.create({
        data: {
          user_id: dist.user_id,
          type: 'PRIZE_WIN',
          amount: dist.amount,
          balance_after: wallet.balance,
          status: 'COMPLETED',
          metadata: {
            season_id: seasonId,
            rank: dist.rank,
          },
        },
      });

      results.push({
        user_id: dist.user_id,
        amount: dist.amount,
        rank: dist.rank,
        wallet_balance: wallet.balance,
        transaction_id: transaction.id,
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
