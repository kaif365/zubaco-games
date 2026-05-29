import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export type CriteriaType =
  | 'games_played'
  | 'games_won'
  | 'total_score'
  | 'single_game_score'
  | 'win_streak'
  | 'unique_games_played'
  | 'challenges_won'
  | 'referrals'
  | 'seasons_participated';

interface AchievementCriteria {
  type: CriteriaType;
  threshold: number;
  gameType?: string; // optional: restrict to specific game
}

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check all achievements for a user and unlock any newly met criteria.
   * Call this after game completion events.
   */
  async evaluateAndUnlock(userId: string): Promise<string[]> {
    const allAchievements = await this.prisma.achievement.findMany();
    const alreadyUnlocked = await this.prisma.userAchievement.findMany({
      where: { user_id: userId },
      select: { achievement_id: true },
    });

    const unlockedIds = new Set(alreadyUnlocked.map((ua) => ua.achievement_id));
    const newlyUnlocked: string[] = [];

    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.id)) continue;

      const criteria = achievement.criteria as unknown as AchievementCriteria;
      const met = await this.checkCriteria(userId, criteria);

      if (met) {
        await this.prisma.userAchievement.create({
          data: { user_id: userId, achievement_id: achievement.id },
        });

        // Award XP
        if (achievement.xp_reward > 0) {
          await this.prisma.user.update({
            where: { id: userId },
            data: { xp: { increment: achievement.xp_reward } },
          });
        }

        newlyUnlocked.push(achievement.key);
        this.logger.log(`User ${userId} unlocked: ${achievement.key}`);
      }
    }

    return newlyUnlocked;
  }

  private async checkCriteria(userId: string, criteria: AchievementCriteria): Promise<boolean> {
    const { type, threshold, gameType } = criteria;

    switch (type) {
      case 'games_played': {
        const count = await this.prisma.gameSession.count({
          where: {
            user_id: userId,
            outcome: 'COMPLETED',
            ...(gameType ? { game_type: gameType as any } : {}),
          },
        });
        return count >= threshold;
      }

      case 'games_won': {
        // Count games where score equals max_score
        const count = await this.prisma.gameSession.count({
          where: {
            user_id: userId,
            outcome: 'COMPLETED',
            score: { not: null },
            max_score: { not: null },
            ...(gameType ? { game_type: gameType as any } : {}),
          },
        });
        return count >= threshold;
      }

      case 'total_score': {
        const result = await this.prisma.gameSession.aggregate({
          where: {
            user_id: userId,
            outcome: 'COMPLETED',
            ...(gameType ? { game_type: gameType as any } : {}),
          },
          _sum: { score: true },
        });
        return (result._sum.score ?? 0) >= threshold;
      }

      case 'single_game_score': {
        const best = await this.prisma.gameSession.findFirst({
          where: {
            user_id: userId,
            outcome: 'COMPLETED',
            ...(gameType ? { game_type: gameType as any } : {}),
          },
          orderBy: { score: 'desc' },
          select: { score: true },
        });
        return (best?.score ?? 0) >= threshold;
      }

      case 'win_streak': {
        const sessions = await this.prisma.gameSession.findMany({
          where: { user_id: userId, outcome: 'COMPLETED' },
          orderBy: { completed_at: 'desc' },
          select: { score: true, max_score: true },
          take: threshold,
        });
        if (sessions.length < threshold) return false;
        return sessions.every((s: { score: number | null; max_score: number | null }) => s.score !== null && s.score === s.max_score);
      }

      case 'unique_games_played': {
        const games = await this.prisma.gameSession.findMany({
          where: { user_id: userId, outcome: 'COMPLETED' },
          select: { game_type: true },
          distinct: ['game_type'],
        });
        return games.length >= threshold;
      }

      case 'challenges_won': {
        // Count challenges where user won (higher score)
        const count = await this.prisma.challenge.count({
          where: {
            status: 'COMPLETED',
            OR: [
              { challenger_id: userId, challenger_score: { gt: this.prisma.challenge.fields.opponent_score as any } },
              { opponent_id: userId, opponent_score: { gt: this.prisma.challenge.fields.challenger_score as any } },
            ],
          },
        });
        return count >= threshold;
      }

      case 'referrals': {
        const count = await this.prisma.referral.count({
          where: { referrer_id: userId },
        });
        return count >= threshold;
      }

      case 'seasons_participated': {
        const count = await this.prisma.seasonEntry.count({
          where: { user_id: userId },
        });
        return count >= threshold;
      }

      default:
        return false;
    }
  }

  /** Get all achievements with unlock status for a user */
  async getUserAchievements(userId: string) {
    const all = await this.prisma.achievement.findMany({ orderBy: { created_at: 'asc' } });
    const unlocked = await this.prisma.userAchievement.findMany({
      where: { user_id: userId },
      select: { achievement_id: true, unlocked_at: true },
    });

    const unlockedMap = new Map(unlocked.map((u) => [u.achievement_id, u.unlocked_at]));

    return all.map((a) => ({
      id: a.id,
      key: a.key,
      name: a.name,
      description: a.description,
      icon_url: a.icon_url,
      xp_reward: a.xp_reward,
      unlocked: unlockedMap.has(a.id),
      unlocked_at: unlockedMap.get(a.id) ?? null,
    }));
  }
}
