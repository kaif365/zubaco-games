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

  // ─── FINANCIAL LEDGER AUDIT & TDS (Module 6.5) ─────────────────────

  async verifyLedgerIntegrity(): Promise<{
    balanced: boolean;
    total_wallet_balance: number;
    net_ledger_balance: number;
    variance: number;
    timestamp: string;
  }> {
    const wallets = await this.prisma.wallet.findMany({
      select: { balance: true },
    });
    const totalWalletBalance = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);

    const txGroup = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    });

    let credits = 0;
    let debits = 0;

    for (const group of txGroup) {
      const amt = Number(group._sum.amount || 0);
      switch (group.type) {
        case 'DEPOSIT':
        case 'PRIZE_WIN':
        case 'REFUND':
        case 'REFERRAL_BONUS':
          credits += amt;
          break;
        case 'WITHDRAWAL':
        case 'ENTRY_FEE':
          debits += amt;
          break;
      }
    }

    const netLedgerBalance = credits - debits;
    const variance = Math.abs(totalWalletBalance - netLedgerBalance);

    // Invariant holds if variance is within floating-point epsilon (< 0.01)
    const balanced = variance < 0.01;

    return {
      balanced,
      total_wallet_balance: Math.round(totalWalletBalance * 100) / 100,
      net_ledger_balance: Math.round(netLedgerBalance * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }

  async getGgrAndRevenueMetrics(): Promise<{
    total_entry_fees: number;
    total_prizes_distributed: number;
    gross_gaming_revenue_ggr: number;
    platform_rake_pct: number;
    timestamp: string;
  }> {
    const txGroup = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    });

    let entryFees = 0;
    let prizeWins = 0;

    for (const group of txGroup) {
      const amt = Number(group._sum.amount || 0);
      if (group.type === 'ENTRY_FEE') entryFees += amt;
      if (group.type === 'PRIZE_WIN') prizeWins += amt;
    }

    const ggr = entryFees - prizeWins;
    const rakePct = entryFees > 0 ? (ggr / entryFees) * 100 : 0;

    return {
      total_entry_fees: Math.round(entryFees * 100) / 100,
      total_prizes_distributed: Math.round(prizeWins * 100) / 100,
      gross_gaming_revenue_ggr: Math.round(ggr * 100) / 100,
      platform_rake_pct: Math.round(rakePct * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }

  async getTdsSummaryReport(): Promise<{
    tax_section: string;
    statutory_tds_rate_pct: number;
    total_taxable_winnings: number;
    total_tds_withheld: number;
    payout_transactions_count: number;
    timestamp: string;
  }> {
    const prizeWins = await this.prisma.transaction.findMany({
      where: { type: 'PRIZE_WIN', status: 'COMPLETED' },
      select: { amount: true },
    });

    const totalGross = prizeWins.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    // Indian Section 194BA specifies flat 30% TDS on net winnings
    const statutoryRate = 30.0;
    const totalTds = totalGross * 0.3;

    return {
      tax_section: 'Section 194BA, Income Tax Act (Online Gaming Winnings)',
      statutory_tds_rate_pct: statutoryRate,
      total_taxable_winnings: Math.round(totalGross * 100) / 100,
      total_tds_withheld: Math.round(totalTds * 100) / 100,
      payout_transactions_count: prizeWins.length,
      timestamp: new Date().toISOString(),
    };
  }

  async exportSection194BaTdsCsv(from?: string, to?: string): Promise<string> {
    const where: any = { type: 'PRIZE_WIN', status: 'COMPLETED' };
    if (from) where.created_at = { ...where.created_at, gte: new Date(from) };
    if (to) where.created_at = { ...where.created_at, lte: new Date(to) };

    const prizeTxs = await this.prisma.transaction.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const headers =
      'user_id,username,display_name,email,gross_winnings,tds_rate_pct,tds_withheld,net_disbursed,reference_id,transaction_date';

    const rows = prizeTxs.map((tx: any) => {
      const gross = Number(tx.amount || 0);
      const tds = Math.round(gross * 0.3 * 100) / 100;
      const net = Math.round((gross - tds) * 100) / 100;

      return [
        escapeCsv(tx.user_id),
        escapeCsv(tx.user?.username || ''),
        escapeCsv(tx.user?.display_name || ''),
        escapeCsv(tx.user?.email || ''),
        escapeCsv(gross),
        escapeCsv('30%'),
        escapeCsv(tds),
        escapeCsv(net),
        escapeCsv(tx.reference_id || tx.id),
        escapeCsv(tx.created_at?.toISOString() || ''),
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  }
}
