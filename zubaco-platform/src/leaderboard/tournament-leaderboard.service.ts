import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';
import { PrismaService } from '../common/prisma/prisma.service';

export const DEFAULT_MAX_MATCH_TIME_MS = 180000; // 3 minutes

export interface TournamentLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  baseScore: number;
  compoundScore: number;
  elapsedMs: number;
}

export interface UserRankResult {
  userId: string;
  rank: number | null;
  totalParticipants: number;
  percentile: number | null;
  baseScore: number | null;
  compoundScore: number | null;
}

/**
 * Computes deterministic compound score:
 * CompoundScore = BaseScore + (TimeRemainingMs / 1,000,000)
 *
 * Invariant:
 * 1. BaseScore S1 > S2 => CompoundScore1 > CompoundScore2
 * 2. If S1 == S2, lower elapsedMs => higher TimeRemainingMs => breaks tie deterministically
 */
export function computeCompoundScore(
  baseScore: number,
  elapsedMs: number,
  maxTimeMs: number = DEFAULT_MAX_MATCH_TIME_MS,
): number {
  const timeRemainingMs = Math.max(0, maxTimeMs - Math.max(0, elapsedMs));
  const microsecondBonus = timeRemainingMs / 1000000;
  return Number((baseScore + microsecondBonus).toFixed(6));
}

export function decomposeCompoundScore(
  compoundScore: number,
  maxTimeMs: number = DEFAULT_MAX_MATCH_TIME_MS,
): {
  baseScore: number;
  timeRemainingMs: number;
  elapsedMs: number;
} {
  const baseScore = Math.floor(compoundScore);
  const decimal = compoundScore - baseScore;
  const timeRemainingMs = Math.round(decimal * 1000000);
  const elapsedMs = Math.max(0, maxTimeMs - timeRemainingMs);
  return { baseScore, timeRemainingMs, elapsedMs };
}

@Injectable()
export class TournamentLeaderboardService {
  private readonly logger = new Logger(TournamentLeaderboardService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generates the Redis key for cohort or unified leaderboards.
   */
  getLeaderboardKey(
    tournamentId: string,
    stageNumber: number,
    cohortId?: string | null,
  ): string {
    const scope = cohortId && cohortId !== 'unified' ? `cohort:${cohortId}` : 'unified';
    return `lb:tourn:${tournamentId}:stage:${stageNumber}:${scope}`;
  }

  /**
   * Submit or update a tournament score in Redis Sorted Set with microsecond compound tie-breaker.
   * Only replaces existing score if the new compound score is strictly higher.
   */
  async recordTournamentScore(
    tournamentId: string,
    stageNumber: number,
    userId: string,
    baseScore: number,
    elapsedMs: number,
    cohortId?: string | null,
  ): Promise<{ compoundScore: number; updated: boolean; rank: number }> {
    const redisKey = this.getLeaderboardKey(tournamentId, stageNumber, cohortId);
    const compoundScore = computeCompoundScore(baseScore, elapsedMs);

    const existingScoreStr = await this.redis.zscore(redisKey, userId);
    let updated = false;

    if (!existingScoreStr || compoundScore > parseFloat(existingScoreStr)) {
      await this.redis.zadd(redisKey, compoundScore, userId);
      updated = true;
    }

    const rank0 = await this.redis.zrevrank(redisKey, userId);
    const rank = rank0 !== null ? rank0 + 1 : 1;

    return {
      compoundScore,
      updated,
      rank,
    };
  }

  /**
   * Retrieve real-time rank and percentile in O(log N).
   */
  async getUserRank(
    tournamentId: string,
    stageNumber: number,
    userId: string,
    cohortId?: string | null,
  ): Promise<UserRankResult> {
    const redisKey = this.getLeaderboardKey(tournamentId, stageNumber, cohortId);

    const [rank0, scoreStr, members] = await Promise.all([
      this.redis.zrevrank(redisKey, userId),
      this.redis.zscore(redisKey, userId),
      this.redis.zrevrange(redisKey, 0, -1),
    ]);

    const totalParticipants = members.length;
    if (rank0 === null || !scoreStr) {
      return {
        userId,
        rank: null,
        totalParticipants,
        percentile: null,
        baseScore: null,
        compoundScore: null,
      };
    }

    const rank = rank0 + 1;
    const compoundScore = parseFloat(scoreStr);
    const { baseScore } = decomposeCompoundScore(compoundScore);
    const percentile =
      totalParticipants > 1
        ? Math.round(((totalParticipants - rank) / (totalParticipants - 1)) * 100)
        : 100;

    return {
      userId,
      rank,
      totalParticipants,
      percentile,
      baseScore,
      compoundScore,
    };
  }

  /**
   * Retrieve paginated leaderboard with microsecond tie-broken rank in O(log N).
   */
  async getLeaderboard(
    tournamentId: string,
    stageNumber: number,
    cohortId?: string | null,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    entries: TournamentLeaderboardEntry[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const redisKey = this.getLeaderboardKey(tournamentId, stageNumber, cohortId);
    const start = (page - 1) * limit;
    const stop = start + limit - 1;

    const raw = await this.redis.zrevrange(redisKey, start, stop, true);
    if (!raw || raw.length === 0) {
      return { entries: [], total: 0, page, totalPages: 0 };
    }

    const items: Array<{ userId: string; compoundScore: number }> = [];
    for (let i = 0; i < raw.length; i += 2) {
      items.push({
        userId: raw[i],
        compoundScore: parseFloat(raw[i + 1]),
      });
    }

    // Fetch user profile metadata
    const userIds = items.map((item) => item.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, display_name: true, username: true, avatar_url: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const entries: TournamentLeaderboardEntry[] = items.map((item, index) => {
      const u = userMap.get(item.userId);
      const { baseScore, elapsedMs } = decomposeCompoundScore(item.compoundScore);
      return {
        rank: start + index + 1,
        userId: item.userId,
        displayName: u?.display_name || u?.username || 'Player',
        avatarUrl: u?.avatar_url || null,
        baseScore,
        compoundScore: item.compoundScore,
        elapsedMs,
      };
    });

    const allMembers = await this.redis.zrevrange(redisKey, 0, -1);
    const total = allMembers.length;

    return {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
