import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

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
        escapeCsv(u.id),
        escapeCsv(u.username),
        escapeCsv(u.display_name || ''),
        escapeCsv(u.email || ''),
        escapeCsv(u.phone || ''),
        escapeCsv(u.xp),
        escapeCsv(u.level),
        escapeCsv(u.is_banned),
        escapeCsv(u.is_verified),
        escapeCsv(u.created_at?.toISOString() || ''),
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
        escapeCsv(r.rank),
        escapeCsv(r.user_id),
        escapeCsv(r.user?.username || ''),
        escapeCsv(r.user?.display_name || ''),
        escapeCsv(r.score),
        escapeCsv(r.prize_amount || 0),
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
        escapeCsv(t.id),
        escapeCsv(t.user_id),
        escapeCsv(t.type),
        escapeCsv(t.amount),
        escapeCsv(t.status),
        escapeCsv(t.created_at?.toISOString() || ''),
      ].join(','),
    );

    return [headers, ...rows].join('\n');
  }
}
