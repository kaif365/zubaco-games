import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { GameType } from '.prisma/client';

// Periods for which a Redis ranking zset is actually maintained. Only the
// all-time board is populated (updateScore writes `:all-time`), so any other
// period is rejected rather than silently returning all-time data (LB-VAL-01).
const SUPPORTED_PERIODS = ['all-time'] as const;

@Injectable()
export class LeaderboardService {
  // Composite encoding for the live stage leaderboard: rank by total_score DESC,
  // then total_time_ms ASC, packed into a single integer zset score so Redis
  // ZREV* ordering matches the authoritative DB tiebreak (LB-VAL-03). A larger
  // composite always ranks higher; time is inverted within a fixed range so a
  // faster cumulative time wins ties on equal score.
  private static readonly STAGE_TIME_RANGE = 16_000_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private encodeStageComposite(totalScore: number, totalTimeMs: number): number {
    const range = LeaderboardService.STAGE_TIME_RANGE;
    const t = Math.min(Math.max(Math.floor(totalTimeMs) || 0, 0), range - 1);
    return totalScore * range + (range - 1 - t);
  }

  private decodeStageScore(composite: number): number {
    return Math.floor(composite / LeaderboardService.STAGE_TIME_RANGE);
  }

  // ─── GLOBAL GAME LEADERBOARD ───────────────────────────────────

  async getGameLeaderboard(gameType: GameType, period: string = 'all-time', page = 1, limit = 50) {
    // Reject periods we do not actually maintain instead of silently serving
    // all-time data under a different label (LB-VAL-01).
    if (!SUPPORTED_PERIODS.includes(period as (typeof SUPPORTED_PERIODS)[number])) {
      throw new BadRequestException(
        `Unsupported leaderboard period '${period}'. Supported periods: ${SUPPORTED_PERIODS.join(', ')}.`,
      );
    }

    const redisKey = `lb:game:${gameType}:${period}`;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Choose a single source for the whole response based on whether the Redis
    // zset exists at all (LB-VAL-02/07). When it is non-empty, every page is
    // served from Redis (an out-of-range page returns []) so pagination never
    // splits between Redis and the DB; only a completely empty zset falls back.
    const total = await this.redis.zcard(redisKey);
    if (total > 0) {
      const cached = await this.redis.zrevrange(redisKey, start, end, true);
      if (!cached || cached.length === 0) {
        return [];
      }

      const entries: { user_id: string; score: number; rank: number }[] = [];
      for (let i = 0; i < cached.length; i += 2) {
        entries.push({ user_id: cached[i], score: parseInt(cached[i + 1], 10), rank: start + i / 2 + 1 });
      }

      const userIds = entries.map((e) => e.user_id);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, display_name: true, avatar_url: true, is_banned: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      // Drop banned users from the visible board while preserving the real zset
      // rank of everyone else (LB-VAL-06).
      return entries
        .filter((e) => !userMap.get(e.user_id)?.is_banned)
        .map((e) => {
          const u = userMap.get(e.user_id);
          return {
            rank: e.rank,
            user: u
              ? { id: u.id, username: u.username, display_name: u.display_name, avatar_url: u.avatar_url }
              : { id: e.user_id },
            score: e.score,
          };
        });
    }

    // Fallback to DB (authoritative, deterministic ordering)
    return this.getGameLeaderboardFromDb(gameType, page, limit);
  }

  private async getGameLeaderboardFromDb(gameType: GameType, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const progress = await this.prisma.gameProgress.findMany({
      // Exclude banned players (LB-VAL-06) and apply a deterministic secondary
      // key so tied scores order consistently with the Redis board (LB-VAL-03).
      where: { game_type: gameType, user: { is_banned: false } },
      orderBy: [{ best_score: 'desc' }, { user_id: 'desc' }],
      skip,
      take: limit,
      include: {
        user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
      },
    });

    return progress.map((p, i) => ({
      rank: skip + i + 1,
      user: p.user,
      score: p.best_score,
      highest_level: p.highest_level,
    }));
  }

  // ─── UPDATE LEADERBOARD SCORE ──────────────────────────────────

  async updateScore(userId: string, gameType: GameType, score: number) {
    const redisKey = `lb:game:${gameType}:all-time`;
    // Atomic write-if-higher (ZADD GT) — no read-then-write race (SCORE-LB-01).
    await this.redis.zaddGt(redisKey, score, userId);
  }

  // ─── GET MY RANK ───────────────────────────────────────────────

  async getMyRank(userId: string, gameType: GameType): Promise<{ rank: number | null; score: number | null }> {
    const redisKey = `lb:game:${gameType}:all-time`;
    const rank = await this.redis.zrevrank(redisKey, userId);
    const score = await this.redis.zscore(redisKey, userId);

    return {
      rank: rank !== null ? rank + 1 : null,
      score: score ? parseInt(score) : null,
    };
  }

  // ─── ENDLESS MODE LEADERBOARD ──────────────────────────────────

  async getEndlessLeaderboard(gameType: GameType, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const progress = await this.prisma.gameProgress.findMany({
      // Exclude banned players (LB-VAL-06) with a deterministic tiebreak (LB-VAL-03).
      where: { game_type: gameType, highest_level: { gt: 10 }, user: { is_banned: false } },
      orderBy: [{ highest_level: 'desc' }, { best_score: 'desc' }, { user_id: 'desc' }],
      skip,
      take: limit,
      include: {
        user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
      },
    });

    return progress.map((p, i) => ({
      rank: skip + i + 1,
      user: p.user,
      highest_level: p.highest_level,
      best_score: p.best_score,
    }));
  }

  // ─── FRIENDS LEADERBOARD ───────────────────────────────────────

  async getFriendsLeaderboard(userId: string, gameType: GameType, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    // Get friend IDs
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { user_id: userId, status: 'ACCEPTED' },
          { friend_id: userId, status: 'ACCEPTED' },
        ],
      },
    });

    const friendIds = friendships.map((f) => (f.user_id === userId ? f.friend_id : f.user_id));
    friendIds.push(userId); // Include self

    const progress = await this.prisma.gameProgress.findMany({
      // Exclude banned players (LB-VAL-06), paginate (LB-VAL-08), and apply a
      // deterministic secondary key for tied scores (LB-VAL-03).
      where: { game_type: gameType, user_id: { in: friendIds }, user: { is_banned: false } },
      orderBy: [{ best_score: 'desc' }, { user_id: 'desc' }],
      skip,
      take: limit,
      include: {
        user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
      },
    });

    return progress.map((p, i) => ({
      rank: skip + i + 1,
      user: p.user,
      score: p.best_score,
      highest_level: p.highest_level,
      is_me: p.user_id === userId,
    }));
  }

  // ─── STAGE LEADERBOARD ─────────────────────────────────────────

  async getStageLeaderboard(stageId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    // Exclude banned players from the visible board (LB-VAL-06). This filter is
    // display-only and does not affect elimination/prize ranking.
    const where = { season_stage_id: stageId, season_entry: { user: { is_banned: false } } };

    const [scores, total] = await Promise.all([
      this.prisma.stageEntry.findMany({
        where,
        // Deterministic ordering consistent with elimination/winner ranking so the
        // displayed rank matches the authoritative tiebreak (SCORE-TB-01).
        orderBy: [
          { total_score: 'desc' },
          { total_time_ms: 'asc' },
          { season_entry: { registered_at: 'asc' } },
          { id: 'asc' },
        ],
        skip,
        take: limit,
        include: {
          season_entry: {
            include: {
              user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
            },
          },
        },
      }),
      this.prisma.stageEntry.count({ where }),
    ]);

    return {
      rankings: scores.map((s: any, i: number) => ({
        rank: skip + i + 1,
        user: s.season_entry.user,
        score: s.total_score,
        completed_at: s.completed_at,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── REAL-TIME STAGE LEADERBOARD (REDIS) ───────────────────────

  /**
   * Update a player's cumulative score in the live stage leaderboard.
   * Called after every tournament game submission.
   */
  async updateStageScore(stageId: string, userId: string, totalScore: number, totalTimeMs = 0) {
    const redisKey = `lb:stage:${stageId}`;
    // Write the authoritative cumulative standing as a (score DESC, time ASC)
    // composite so the live board orders ties the same way the DB board does
    // (LB-VAL-03). The value is derived from the just-committed StageEntry totals;
    // a player's tournament games are serialized by the single-active-session
    // invariant, so this overwrite always reflects the latest authoritative
    // total and cannot be regressed by an out-of-order write (LB-VAL-04).
    const composite = this.encodeStageComposite(totalScore, totalTimeMs);
    await this.redis.zadd(redisKey, composite, userId);
  }

  /**
   * Get live stage leaderboard from Redis with user details.
   * Falls back to DB if Redis is empty.
   */
  async getLiveStageLeaderboard(stageId: string, page = 1, limit = 50) {
    const redisKey = `lb:stage:${stageId}`;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Single-source the whole response by zset existence (LB-VAL-02/07): if the
    // live board exists, every page comes from Redis; only a fully empty board
    // falls back to the DB.
    const total = await this.redis.zcard(redisKey);
    if (total > 0) {
      const cached = await this.redis.zrevrange(redisKey, start, end, true);
      if (!cached || cached.length === 0) {
        return { rankings: [], total, page, totalPages: Math.ceil(total / limit) };
      }

      const entries: { user_id: string; score: number; rank: number }[] = [];
      for (let i = 0; i < cached.length; i += 2) {
        // Decode the packed composite back to the displayed total score (LB-VAL-03).
        entries.push({
          user_id: cached[i],
          score: this.decodeStageScore(Number(cached[i + 1])),
          rank: start + i / 2 + 1,
        });
      }

      const userIds = entries.map((e) => e.user_id);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, display_name: true, avatar_url: true, is_banned: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      return {
        // Drop banned players while preserving everyone else's true rank (LB-VAL-06).
        rankings: entries
          .filter((e) => !userMap.get(e.user_id)?.is_banned)
          .map((e) => {
            const u = userMap.get(e.user_id);
            return {
              rank: e.rank,
              user: u
                ? { id: u.id, username: u.username, display_name: u.display_name, avatar_url: u.avatar_url }
                : { id: e.user_id },
              score: e.score,
            };
          }),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Fallback to DB
    return this.getStageLeaderboard(stageId, page, limit);
  }

  /**
   * Get a specific user's live rank in a stage.
   */
  async getMyStageRank(stageId: string, userId: string): Promise<{ rank: number | null; score: number | null }> {
    const redisKey = `lb:stage:${stageId}`;
    const rank = await this.redis.zrevrank(redisKey, userId);
    const score = await this.redis.zscore(redisKey, userId);

    return {
      rank: rank !== null ? rank + 1 : null,
      // Decode the packed composite back to the displayed total score (LB-VAL-03).
      score: score !== null ? this.decodeStageScore(Number(score)) : null,
    };
  }

  /**
   * Clean up Redis sorted set for a stage (called after elimination closes).
   */
  async clearStageLeaderboard(stageId: string) {
    await this.redis.del(`lb:stage:${stageId}`);
  }
}
