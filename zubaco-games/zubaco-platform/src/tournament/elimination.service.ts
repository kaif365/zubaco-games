import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { WalletService } from '../wallet/wallet.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';

@Injectable()
export class EliminationService {
  private readonly logger = new Logger(EliminationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly walletService: WalletService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  /**
   * Run elimination for a given stage.
   * Bottom X% of players by score are eliminated.
   * Tiebreaker: total time (lower = better).
   */
  async runElimination(seasonStageId: string) {
    const stage = await this.prisma.seasonStage.findUnique({
      where: { id: seasonStageId },
    });

    if (!stage) throw new Error('Stage not found');

    // Get all completed stage entries
    const entries = await this.prisma.stageEntry.findMany({
      where: {
        season_stage_id: seasonStageId,
        completed_at: { not: null },
      },
      orderBy: [
        { total_score: 'desc' },
        { total_time_ms: 'asc' }, // Tiebreaker: faster wins
      ],
      include: { season_entry: true },
    });

    if (entries.length === 0) return { eliminated: 0, survived: 0 };

    // Calculate cutoff
    const eliminationPct = stage.elimination_pct / 100;
    const surviveCount = Math.ceil(entries.length * (1 - eliminationPct));

    // Assign ranks
    const updates = entries.map((entry, index) => {
      const rank = index + 1;
      const eliminated = rank > surviveCount;

      return this.prisma.stageEntry.update({
        where: { id: entry.id },
        data: { rank, eliminated },
      });
    });

    await this.prisma.$transaction(updates);

    // Update season entries for eliminated players
    const eliminatedEntries = entries.slice(surviveCount);
    if (eliminatedEntries.length > 0) {
      await this.prisma.seasonEntry.updateMany({
        where: { id: { in: eliminatedEntries.map((e) => e.season_entry_id) } },
        data: { status: 'ELIMINATED' },
      });
    }

    // Close stage
    await this.prisma.seasonStage.update({
      where: { id: seasonStageId },
      data: { status: 'CLOSED' },
    });

    // Clean up Redis live leaderboard for this stage
    await this.leaderboardService.clearStageLeaderboard(seasonStageId);

    // Send notifications to eliminated and surviving players
    const stageInfo = await this.prisma.seasonStage.findUnique({
      where: { id: seasonStageId },
      include: { season: { select: { name: true } } },
    });
    const stageName = `Stage ${stageInfo?.stage_number ?? '?'}`;
    const seasonName = stageInfo?.season?.name ?? 'Tournament';

    // Notify eliminated players
    const eliminatedUserIds = await this.getSeasonEntryUserIds(
      eliminatedEntries.map((e) => e.season_entry_id),
    );
    if (eliminatedUserIds.length > 0) {
      await this.notificationService.sendBulkNotification(
        eliminatedUserIds,
        'TOURNAMENT' as any,
        `Eliminated from ${stageName}`,
        `You finished in the bottom ${stage.elimination_pct}% in ${seasonName} ${stageName}. Better luck next time!`,
        { screen: 'Tournament', seasonId: stage.season_id },
      );
    }

    // Notify surviving players
    const survivedEntries = entries.slice(0, surviveCount);
    const survivedUserIds = await this.getSeasonEntryUserIds(
      survivedEntries.map((e) => e.season_entry_id),
    );
    if (survivedUserIds.length > 0) {
      await this.notificationService.sendBulkNotification(
        survivedUserIds,
        'TOURNAMENT' as any,
        `Advanced past ${stageName}! 🎉`,
        `Congratulations! You survived ${seasonName} ${stageName}. Get ready for the next round!`,
        { screen: 'Tournament', seasonId: stage.season_id },
      );
    }

    return {
      total_players: entries.length,
      survived: surviveCount,
      eliminated: entries.length - surviveCount,
    };
  }

  /**
   * Distribute prizes to winners after the final stage.
   * Split: 1st 50%, 2nd 25%, 3rd 15%, 4th-10th split 10%.
   */
  async distributePrizes(seasonId: string, finalStageId: string) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId } });
    if (!season || !season.prize_pool || Number(season.prize_pool) <= 0) return;

    const prizePool = Number(season.prize_pool);

    // Get winners ranked by score
    const winners = await this.prisma.stageEntry.findMany({
      where: { season_stage_id: finalStageId, eliminated: false, completed_at: { not: null } },
      orderBy: [{ total_score: 'desc' }, { total_time_ms: 'asc' }],
      include: {
        season_entry: {
          include: { user: { select: { id: true, display_name: true } } },
        },
      },
    });

    if (winners.length === 0) return;

    // Prize distribution tiers
    const payouts: { userId: string; amount: number; rank: number }[] = [];

    const distributeTier = (rank: number, pct: number) => {
      if (winners.length >= rank) {
        const amount = Math.floor(prizePool * pct);
        payouts.push({ userId: winners[rank - 1].season_entry.user.id, amount, rank });
      }
    };

    distributeTier(1, 0.50); // 1st: 50%
    distributeTier(2, 0.25); // 2nd: 25%
    distributeTier(3, 0.15); // 3rd: 15%

    // 4th-10th split 10%
    const remaining = winners.slice(3, 10);
    if (remaining.length > 0) {
      const perPlayer = Math.floor((prizePool * 0.10) / remaining.length);
      remaining.forEach((w, i) => {
        payouts.push({ userId: w.season_entry.user.id, amount: perPlayer, rank: i + 4 });
      });
    }

    // Credit wallets and send notifications
    for (const payout of payouts) {
      try {
        await this.walletService.creditPrize(payout.userId, payout.amount, seasonId);

        await this.notificationService.sendNotification(
          payout.userId,
          'TOURNAMENT' as any,
          `🏆 You won ₹${payout.amount.toLocaleString()}!`,
          `Rank #${payout.rank} in ${season.name}. Prize has been credited to your wallet.`,
          { screen: 'Wallet', seasonId },
        );

        this.logger.log(`Prize ₹${payout.amount} credited to rank #${payout.rank} (${payout.userId})`);
      } catch (err) {
        this.logger.error(`Failed to credit prize to ${payout.userId}:`, err);
      }
    }
  }

  private async getSeasonEntryUserIds(seasonEntryIds: string[]): Promise<string[]> {
    if (seasonEntryIds.length === 0) return [];
    const entries = await this.prisma.seasonEntry.findMany({
      where: { id: { in: seasonEntryIds } },
      select: { user_id: true },
    });
    return entries.map((e) => e.user_id);
  }

  /**
   * Get stage rankings
   */
  async getStageRankings(seasonStageId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.stageEntry.findMany({
        where: { season_stage_id: seasonStageId, completed_at: { not: null } },
        orderBy: [{ total_score: 'desc' }, { total_time_ms: 'asc' }],
        skip,
        take: limit,
        include: {
          season_entry: {
            include: { user: { select: { id: true, username: true, display_name: true, avatar_url: true } } },
          },
        },
      }),
      this.prisma.stageEntry.count({
        where: { season_stage_id: seasonStageId, completed_at: { not: null } },
      }),
    ]);

    return {
      rankings: entries.map((e, i) => ({
        rank: skip + i + 1,
        user: e.season_entry.user,
        total_score: e.total_score,
        total_time_ms: e.total_time_ms,
        eliminated: e.eliminated,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
