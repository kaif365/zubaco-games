import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: { select: { balance: true, bonus_balance: true, currency: true } },
        game_progress: {
          select: { game_type: true, current_level: true, highest_level: true, best_score: true, total_plays: true },
        },
        achievements: { include: { achievement: true }, orderBy: { unlocked_at: 'desc' }, take: 10 },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const { deleted_at, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const existing = await this.prisma.user.findFirst({
        where: { username: dto.username, id: { not: userId } },
      });
      if (existing) throw new ConflictException('Username already taken');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.username && { username: dto.username }),
        ...(dto.display_name && { display_name: dto.display_name }),
        ...(dto.avatar_url && { avatar_url: dto.avatar_url }),
      },
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_url: true,
        email: true,
        phone: true,
        xp: true,
        level: true,
      },
    });
  }

  async getGameHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      this.prisma.gameSession.findMany({
        where: { user_id: userId },
        orderBy: { started_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          game_type: true,
          mode: true,
          level: true,
          score: true,
          duration_ms: true,
          outcome: true,
          started_at: true,
        },
      }),
      this.prisma.gameSession.count({ where: { user_id: userId } }),
    ]);

    return { sessions, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getStats(userId: string) {
    const [totalGames, totalScore, progress] = await Promise.all([
      this.prisma.gameSession.count({ where: { user_id: userId, outcome: 'COMPLETED' } }),
      this.prisma.gameSession.aggregate({
        where: { user_id: userId, outcome: 'COMPLETED' },
        _sum: { score: true },
      }),
      this.prisma.gameProgress.findMany({
        where: { user_id: userId },
        select: { game_type: true, highest_level: true, best_score: true, total_plays: true },
      }),
    ]);

    return {
      total_games_played: totalGames,
      total_score: totalScore._sum.score || 0,
      games: progress,
    };
  }

  async addXp(userId: string, xp: number): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const newXp = user.xp + xp;
    const newLevel = this.calculateLevel(newXp);

    await this.prisma.user.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel },
    });
  }

  private calculateLevel(xp: number): number {
    // Level formula: each level requires level * 100 XP
    // Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, Level 4: 600 XP...
    let level = 1;
    let required = 0;
    while (required + level * 100 <= xp) {
      required += level * 100;
      level++;
    }
    return level;
  }

  async getTournamentHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      this.prisma.seasonEntry.findMany({
        where: { user_id: userId },
        orderBy: { registered_at: 'desc' },
        skip,
        take: limit,
        include: {
          season: {
            select: {
              id: true,
              name: true,
              status: true,
              start_date: true,
              end_date: true,
              prize_pool: true,
            },
          },
          stage_entries: {
            select: { total_score: true },
          },
        },
      }),
      this.prisma.seasonEntry.count({ where: { user_id: userId } }),
    ]);

    return {
      entries: entries.map((e) => ({
        season: e.season,
        status: e.status,
        stages_cleared: e.stage_entries.length,
        total_score: e.stage_entries.reduce((sum, se) => sum + se.total_score, 0),
        registered_at: e.registered_at,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async requestAccountDeletion(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Soft delete: anonymize PII, mark deleted, keep financial records
    const deletedAt = new Date();

    await this.prisma.$transaction([
      // Anonymize user data
      this.prisma.user.update({
        where: { id: userId },
        data: {
          phone: `DELETED_${userId.slice(0, 8)}`,
          email: null,
          display_name: 'Deleted User',
          username: null,
          avatar_url: null,
          deleted_at: deletedAt,
          is_verified: false,
        },
      }),
      // Remove auth providers
      this.prisma.authProvider.deleteMany({ where: { user_id: userId } }),
      // Revoke all tokens
      this.prisma.refreshToken.deleteMany({ where: { user_id: userId } }),
    ]);

    return {
      message: 'Account scheduled for deletion. Data has been anonymized.',
      deleted_at: deletedAt.toISOString(),
    };
  }
}
