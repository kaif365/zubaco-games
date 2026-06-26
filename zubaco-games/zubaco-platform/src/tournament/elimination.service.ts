import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { WalletService } from '../wallet/wallet.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { TournamentEventsService } from './tournament-events.service';

@Injectable()
export class EliminationService {
  private readonly logger = new Logger(EliminationService.name);

  // Bound the size of any single elimination/ranking transaction so a stage with
  // tens of thousands of finishers does not produce one giant long-held lock.
  private static readonly RANK_CHUNK_SIZE = 500;
  // Bound the size of any single bulk-notification call.
  private static readonly NOTIFY_CHUNK_SIZE = 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly walletService: WalletService,
    private readonly leaderboardService: LeaderboardService,
    private readonly events: TournamentEventsService,
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

    // Get all completed stage entries.
    // Tiebreakers (deterministic, fair): higher score → faster time → earlier
    // registration → stable id, so a fixed cutoff never depends on row ordering.
    const entries = await this.prisma.stageEntry.findMany({
      where: {
        season_stage_id: seasonStageId,
        completed_at: { not: null },
      },
      orderBy: [
        { total_score: 'desc' },
        { total_time_ms: 'asc' },
        { season_entry: { registered_at: 'asc' } },
        { id: 'asc' },
      ],
      include: { season_entry: true },
    });

    // Clamp elimination_pct into a sane (0,100) range before computing the cutoff
    // so misconfigured stages cannot survive everyone or eliminate everyone via
    // negative/over-100 slicing.
    const clampedPct = Math.min(100, Math.max(0, stage.elimination_pct));
    const eliminationPct = clampedPct / 100;
    const surviveCount =
      entries.length === 0 ? 0 : Math.max(0, Math.min(entries.length, Math.ceil(entries.length * (1 - eliminationPct))));

    // Assign ranks + eliminated flags among finishers, in bounded chunks.
    for (let i = 0; i < entries.length; i += EliminationService.RANK_CHUNK_SIZE) {
      const slice = entries.slice(i, i + EliminationService.RANK_CHUNK_SIZE);
      await this.prisma.$transaction(
        slice.map((entry, j) => {
          const rank = i + j + 1;
          return this.prisma.stageEntry.update({
            where: { id: entry.id },
            data: { rank, eliminated: rank > surviveCount },
          });
        }),
      );
    }

    // Update season entries for eliminated finishers
    const eliminatedEntries = entries.slice(surviveCount);
    if (eliminatedEntries.length > 0) {
      await this.prisma.seasonEntry.updateMany({
        where: { id: { in: eliminatedEntries.map((e) => e.season_entry_id) } },
        data: { status: 'ELIMINATED' },
      });
    }

    // TOURN-Q-01: eliminate non-finishers. Anyone still ACTIVE in this season who
    // did NOT complete this stage (no completed StageEntry) must not silently
    // survive — they are eliminated alongside the bottom-ranked finishers.
    const finisherSeasonEntryIds = entries.map((e) => e.season_entry_id);
    const nonFinishers = await this.prisma.seasonEntry.findMany({
      where: {
        season_id: stage.season_id,
        status: 'ACTIVE',
        id: { notIn: finisherSeasonEntryIds },
      },
      select: { id: true },
    });
    const nonFinisherSeasonEntryIds = nonFinishers.map((n) => n.id);
    if (nonFinisherSeasonEntryIds.length > 0) {
      await this.prisma.seasonEntry.updateMany({
        where: { id: { in: nonFinisherSeasonEntryIds } },
        data: { status: 'ELIMINATED' },
      });
      // Flag any partial (incomplete) stage entries they may have started.
      await this.prisma.stageEntry.updateMany({
        where: { season_stage_id: seasonStageId, season_entry_id: { in: nonFinisherSeasonEntryIds } },
        data: { eliminated: true },
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

    // Notify eliminated players (bottom-ranked finishers + non-finishers)
    const eliminatedUserIds = await this.getSeasonEntryUserIds([
      ...eliminatedEntries.map((e) => e.season_entry_id),
      ...nonFinisherSeasonEntryIds,
    ]);
    if (eliminatedUserIds.length > 0) {
      await this.notifyInBatches(
        eliminatedUserIds,
        `Eliminated from ${stageName}`,
        `You did not advance past ${seasonName} ${stageName}. Better luck next time!`,
        { screen: 'Tournament', seasonId: stage.season_id },
      );
    }

    // Notify surviving players
    const survivedEntries = entries.slice(0, surviveCount);
    const survivedUserIds = await this.getSeasonEntryUserIds(
      survivedEntries.map((e) => e.season_entry_id),
    );
    if (survivedUserIds.length > 0) {
      await this.notifyInBatches(
        survivedUserIds,
        `Advanced past ${stageName}! 🎉`,
        `Congratulations! You survived ${seasonName} ${stageName}. Get ready for the next round!`,
        { screen: 'Tournament', seasonId: stage.season_id },
      );
    }

    const eliminatedCount = (entries.length - surviveCount) + nonFinisherSeasonEntryIds.length;

    this.events.emit('tournament.elimination.completed', stage.season_id, {
      stageId: seasonStageId,
      finishers: entries.length,
      survived: surviveCount,
      eliminated: eliminatedCount,
      eliminationPct: clampedPct,
    });

    return {
      total_players: entries.length + nonFinisherSeasonEntryIds.length,
      survived: surviveCount,
      eliminated: eliminatedCount,
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

    if (payouts.length === 0) return;

    // TOURN-WIN-01: account for the rounding remainder (paise/whole-rupee floors
    // and the unallocated tail when there are fewer than 10 winners) by awarding
    // it to the 1st-place winner instead of silently retaining it.
    const distributed = payouts.reduce((sum, p) => sum + p.amount, 0);
    const remainder = Math.round((prizePool - distributed) * 100) / 100;
    if (remainder > 0) {
      payouts[0].amount += remainder;
    }

    // Credit wallets and send notifications. A credit failure must not be silently
    // dropped — retry, then record an owed FAILED transaction for reconciliation.
    for (const payout of payouts) {
      if (payout.amount <= 0) continue;
      await this.creditPrizeWithRetry(payout, seasonId, season.name);
    }

    this.events.emit('tournament.prize.distributed', seasonId, {
      finalStageId,
      prizePool,
      payouts: payouts.map((p) => ({ userId: p.userId, rank: p.rank, amount: p.amount })),
    });
  }

  /**
   * Credit a single prize with bounded retries. If every attempt fails, persist an
   * owed PRIZE_WIN transaction with FAILED status so it can be reconciled/paid out
   * later instead of being permanently lost.
   */
  private async creditPrizeWithRetry(
    payout: { userId: string; amount: number; rank: number },
    seasonId: string,
    seasonName: string,
  ): Promise<void> {
    const MAX_ATTEMPTS = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.walletService.creditPrize(payout.userId, payout.amount, seasonId);

        try {
          await this.notificationService.sendNotification(
            payout.userId,
            'TOURNAMENT' as any,
            `🏆 You won ₹${payout.amount.toLocaleString()}!`,
            `Rank #${payout.rank} in ${seasonName}. Prize has been credited to your wallet.`,
            { screen: 'Wallet', seasonId },
          );
        } catch (notifyErr) {
          // Notification failure must not undo a successful credit.
          this.logger.warn(`Prize credited but notification failed for ${payout.userId}: ${String(notifyErr)}`);
        }

        this.logger.log(`Prize ₹${payout.amount} credited to rank #${payout.rank} (${payout.userId})`);
        return;
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `Prize credit attempt ${attempt}/${MAX_ATTEMPTS} failed for ${payout.userId}: ${String(err)}`,
        );
      }
    }

    // All retries exhausted — record an owed ledger entry for reconciliation.
    this.logger.error(
      `Failed to credit prize to ${payout.userId} after ${MAX_ATTEMPTS} attempts; recording owed entry.`,
      lastError as Error,
    );
    try {
      await this.prisma.transaction.create({
        data: {
          user_id: payout.userId,
          type: 'PRIZE_WIN',
          amount: payout.amount,
          balance_after: 0,
          status: 'FAILED',
          reference_id: seasonId,
          description: `Owed tournament prize (rank #${payout.rank}) — credit failed, pending reconciliation`,
        },
      });
    } catch (ledgerErr) {
      this.logger.error(`Failed to record owed prize ledger for ${payout.userId}:`, ledgerErr as Error);
    }
  }

  /**
   * Send bulk notifications in bounded batches to avoid a single oversized
   * insert/push fan-out for stages with very large player counts.
   */
  private async notifyInBatches(
    userIds: string[],
    title: string,
    body: string,
    data: Record<string, any>,
  ): Promise<void> {
    for (let i = 0; i < userIds.length; i += EliminationService.NOTIFY_CHUNK_SIZE) {
      const batch = userIds.slice(i, i + EliminationService.NOTIFY_CHUNK_SIZE);
      try {
        await this.notificationService.sendBulkNotification(batch, 'TOURNAMENT' as any, title, body, data);
      } catch (err) {
        this.logger.warn(`Bulk notification batch failed (${batch.length} users): ${String(err)}`);
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
