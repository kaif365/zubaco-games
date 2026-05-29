import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportUsersCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        username: true,
        display_name: true,
        email: true,
        phone: true,
        xp: true,
        level: true,
        is_banned: true,
        is_verified: true,
        created_at: true,
      },
    });

    const headers = 'id,username,display_name,email,phone,xp,level,is_banned,is_verified,created_at';
    const rows = users.map((u) =>
      [
        u.id,
        u.username,
        u.display_name || '',
        u.email || '',
        u.phone || '',
        u.xp,
        u.level,
        u.is_banned,
        u.is_verified,
        u.created_at?.toISOString() || '',
      ].join(','),
    );

    return [headers, ...rows].join('\n');
  }

  async exportSeasonResultsCsv(seasonId: string): Promise<string> {
    const results = await this.prisma.seasonLeaderboard.findMany({
      where: { season_id: seasonId },
      include: { user: { select: { username: true, display_name: true } } },
      orderBy: { rank: 'asc' },
    });

    const headers = 'rank,user_id,username,display_name,score,prize_amount';
    const rows = results.map((r: any) =>
      [
        r.rank,
        r.user_id,
        r.user?.username || '',
        r.user?.display_name || '',
        r.score,
        r.prize_amount || 0,
      ].join(','),
    );

    return [headers, ...rows].join('\n');
  }

  async exportTransactionsCsv(from?: string, to?: string): Promise<string> {
    const where: any = {};
    if (from) where.created_at = { ...where.created_at, gte: new Date(from) };
    if (to) where.created_at = { ...where.created_at, lte: new Date(to) };

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        user_id: true,
        type: true,
        amount: true,
        status: true,
        created_at: true,
      },
    });

    const headers = 'id,user_id,type,amount,status,created_at';
    const rows = transactions.map((t) =>
      [
        t.id,
        t.user_id,
        t.type,
        t.amount,
        t.status,
        t.created_at?.toISOString() || '',
      ].join(','),
    );

    return [headers, ...rows].join('\n');
  }
}
