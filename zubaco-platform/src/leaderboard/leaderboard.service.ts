import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { GameType } from '.prisma/client';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── GLOBAL GAME LEADERBOARD ───────────────────────────────────

  async getGameLeaderboard(gameType: GameType, period: string = 'all-time', page = 1, limit = 50) {
    const redisKey = `lb:game:${gameType}:${period}`;

    // Try Redis first for real-time rankings
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const cached = await this.redis.zrevrange(redisKey, start, end, true);

    if (cached && cached.length > 0) {
      // Parse Redis sorted set results (alternating member, score)
      const entries = [];
      for (let i = 0; i < cached.length; i += 2) {
        entries.push({ user_id: cached[i], score: parseInt(cached[i + 1]) });
      }

      // Fetch user details
      const userIds = entries.map((e) => e.user_id);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, display_name: true, avatar_url: true },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));
      return entries.map((e, i) => ({
        rank: start + i + 1,
        user: userMap.get(e.user_id) || { id: e.user_id },
        score: e.score,
      }));
    }

    // Fallback to DB
    return this.getGameLeaderboardFromDb(gameType, page, limit);
  }

  private async getGameLeaderboardFromDb(gameType: GameType, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const progress = await this.prisma.gameProgress.findMany({
      where: { game_type: gameType },
      orderBy: { best_score: 'desc' },
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
    const currentScore = await this.redis.zscore(redisKey, userId);

    // Only update if new score is higher
    if (!currentScore || score > parseInt(currentScore)) {
      await this.redis.zadd(redisKey, score, userId);
    }
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
      where: { game_type: gameType, highest_level: { gt: 10 } },
      orderBy: { highest_level: 'desc' },
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

  async getFriendsLeaderboard(userId: string, gameType: GameType) {
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
      where: { game_type: gameType, user_id: { in: friendIds } },
      orderBy: { best_score: 'desc' },
      include: {
        user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
      },
    });

    return progress.map((p, i) => ({
      rank: i + 1,
      user: p.user,
      score: p.best_score,
      highest_level: p.highest_level,
      is_me: p.user_id === userId,
    }));
  }

  // ─── STAGE LEADERBOARD ─────────────────────────────────────────

  async getStageLeaderboard(stageId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [scores, total] = await Promise.all([
      this.prisma.stageEntry.findMany({
        where: { season_stage_id: stageId },
        orderBy: { total_score: 'desc' },
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
      this.prisma.stageEntry.count({ where: { season_stage_id: stageId } }),
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
}
