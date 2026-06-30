import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { WalletService } from '../../wallet/wallet.service';
import { EventBusService } from '../../events/event-bus.service';
import { PlatformEventType } from '../../events/event.types';
import { RewardEligibility } from './tournament.types';

export type RewardPayoutStatus =
  | 'DISTRIBUTED'
  | 'ALREADY_RUNNING'
  | 'SEASON_NOT_COMPLETED'
  | 'NO_PRIZE_POOL'
  | 'NO_WINNERS';

export interface RewardPayoutResult {
  seasonId: string;
  status: RewardPayoutStatus;
  eligible: number;
  credited: number;
  alreadyPaid: number;
  skipped: number;
  totalCredited: number;
}

/**
 * Authoritative tournament prize payout runtime (M2).
 *
 * Eligibility (survivors of the final stage, banned/disqualified excluded) is
 * resolved by the authoritative `TournamentOrchestrator.resolveRewardEligibility`;
 * the caller passes that winner list here so this service stays a one-way
 * dependency (no orchestrator coupling, no circular DI). Each winner is paid
 * through the single wallet pipeline (`WalletService.creditPrize` ->
 * `WalletLedgerService.post(TOURNAMENT_PAYOUT)`), which is idempotent per
 * season+user (`ledger_key = prize:<seasonId>:<userId>`), so no winner can be
 * paid twice. A per-season Redis lock prevents concurrent double distribution;
 * WALLET_CREDITED is published once per credited winner (deterministic event id).
 */
@Injectable()
export class RewardPayoutService {
  private readonly logger = new Logger(RewardPayoutService.name);
  private static readonly LOCK_PREFIX = 'tourn:reward:payout:';
  private static readonly LOCK_TTL_SECONDS = 3600;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly wallet: WalletService,
    private readonly events: EventBusService,
  ) {}

  /**
   * Credit prizes to the supplied eligible winners. Safe to call repeatedly
   * (automatic on season completion + admin retry): the ledger idempotency key
   * guarantees at-most-once payout per season+user.
   */
  async distributeRewards(seasonId: string, winners: RewardEligibility[]): Promise<RewardPayoutResult> {
    const base = { seasonId, eligible: winners.length, credited: 0, alreadyPaid: 0, skipped: 0, totalCredited: 0 };

    const lockKey = `${RewardPayoutService.LOCK_PREFIX}${seasonId}`;
    const fresh = await this.redis.setnx(lockKey, String(Date.now()));
    if (!fresh) {
      return { ...base, status: 'ALREADY_RUNNING' };
    }
    await this.redis.expire(lockKey, RewardPayoutService.LOCK_TTL_SECONDS);

    try {
      // Only a COMPLETED season pays out (authoritative gate).
      const season = await this.prisma.season.findUnique({ where: { id: seasonId } });
      if (!season || season.status !== 'COMPLETED') {
        return { ...base, status: 'SEASON_NOT_COMPLETED' };
      }

      const prizePool = Number(season.prize_pool ?? 0);
      if (prizePool <= 0) {
        this.logger.log(`Season ${seasonId} has no prize pool; nothing to distribute.`);
        return { ...base, status: 'NO_PRIZE_POOL' };
      }
      if (winners.length === 0) {
        return { ...base, status: 'NO_WINNERS' };
      }

      const amounts = this.computeAmounts(prizePool, winners, season.rules);

      let credited = 0;
      let alreadyPaid = 0;
      let skipped = 0;
      let totalCredited = 0;

      for (let i = 0; i < winners.length; i++) {
        const w = winners[i];
        const amount = amounts[i] ?? 0;
        if (amount <= 0) {
          skipped++;
          continue;
        }

        // Defense-in-depth: never pay a banned user, even if the ban landed
        // after eligibility was resolved. (Disqualified/eliminated and
        // incomplete entries are already excluded by resolveRewardEligibility.)
        const user = await this.prisma.user.findUnique({
          where: { id: w.userId },
          select: { is_banned: true },
        });
        if (!user || user.is_banned) {
          skipped++;
          continue;
        }

        try {
          const res = await this.wallet.creditPrize(w.userId, amount, seasonId);
          if (res.applied) {
            credited++;
            totalCredited += amount;
            // Drives in-app notification + outbound webhook via the event bus.
            await this.events.publish(
              PlatformEventType.WALLET_CREDITED,
              {
                amount,
                source: 'tournament_prize',
                season_id: seasonId,
                season_entry_id: w.seasonEntryId,
                rank: w.rank,
                balance_after: res.new_balance,
                transaction_id: res.transaction_id,
              },
              w.userId,
              `wallet.credited:prize:${seasonId}:${w.seasonEntryId}`,
            );
          } else {
            // Ledger short-circuited an already-paid winner — never paid twice.
            alreadyPaid++;
          }
        } catch (err) {
          skipped++;
          this.logger.warn(
            `Prize credit failed for user ${w.userId} (season ${seasonId}): ${(err as Error).message}`,
          );
        }
      }

      this.logger.log(
        `Season ${seasonId} rewards distributed: credited=${credited} alreadyPaid=${alreadyPaid} skipped=${skipped} total=₹${totalCredited}`,
      );
      return { ...base, status: 'DISTRIBUTED', credited, alreadyPaid, skipped, totalCredited };
    } finally {
      // Release the concurrency guard; the ledger idempotency key is the
      // authoritative at-most-once money guarantee, so a later retry is safe and
      // can pick up any winner skipped by a transient failure.
      await this.redis.del(lockKey);
    }
  }

  /**
   * Prize amount per winner (by rank order). Distribution is read from
   * `season.rules.prize_distribution` (an array of percentages of prize_pool by
   * rank); if not configured, a default top-3 split is applied. Ranks beyond the
   * distribution receive nothing.
   */
  private computeAmounts(prizePool: number, winners: RewardEligibility[], rules: unknown): number[] {
    const r = (rules as { prize_distribution?: unknown }) ?? {};
    const configured = Array.isArray(r.prize_distribution) ? r.prize_distribution : null;
    const pct =
      configured && configured.length > 0
        ? configured.map((v) => Number(v) || 0)
        : RewardPayoutService.defaultDistribution(winners.length);

    return winners.map((_, i) => {
      const share = Number(pct[i] ?? 0);
      if (share <= 0) return 0;
      // Round to paise (2 dp).
      return Math.round(prizePool * (share / 100) * 100) / 100;
    });
  }

  /** Default top-heavy split (percentages) when the season defines none. */
  private static defaultDistribution(winnerCount: number): number[] {
    if (winnerCount <= 1) return [100];
    if (winnerCount === 2) return [60, 40];
    return [50, 30, 20]; // ranks 4+ receive 0 by default
  }
}
