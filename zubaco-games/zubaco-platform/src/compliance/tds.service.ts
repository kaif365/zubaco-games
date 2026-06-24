import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * TDS (Tax Deducted at Source) on online gaming winnings.
 * 
 * As per Section 194BA of the Income Tax Act (effective April 2023):
 * - 30% TDS on NET winnings (winnings - entry fees) at time of withdrawal
 * - Applies when net winnings exceed ₹0 for the financial year
 * - PAN required; without PAN, TDS rate is 30% (no threshold)
 */
@Injectable()
export class TdsService {
  private readonly TDS_RATE = 0.30; // 30% flat rate on net winnings

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current financial year string (e.g., "2026-27")
   */
  private getFinancialYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    // FY starts April 1
    if (month >= 3) {
      return `${year}-${(year + 1).toString().slice(2)}`;
    }
    return `${year - 1}-${year.toString().slice(2)}`;
  }

  /**
   * Calculate TDS applicable on a withdrawal.
   * Net winnings = Total winnings - Total entry fees paid (for the FY)
   */
  async calculateTds(userId: string, withdrawalAmount: number): Promise<{
    grossWinnings: number;
    totalEntryFees: number;
    netWinnings: number;
    tdsAlreadyPaid: number;
    tdsOnThisWithdrawal: number;
    amountAfterTds: number;
  }> {
    const fy = this.getFinancialYear();
    const fyStart = this.getFyStartDate();

    // Total winnings this FY
    const winnings = await this.prisma.transaction.aggregate({
      where: {
        user_id: userId,
        type: 'PRIZE_WIN',
        status: 'COMPLETED',
        created_at: { gte: fyStart },
      },
      _sum: { amount: true },
    });

    // Total entry fees paid this FY
    const entryFees = await this.prisma.transaction.aggregate({
      where: {
        user_id: userId,
        type: 'ENTRY_FEE',
        status: 'COMPLETED',
        created_at: { gte: fyStart },
      },
      _sum: { amount: true },
    });

    // TDS already deducted this FY
    const tdsPaid = await this.prisma.tdsRecord.aggregate({
      where: { user_id: userId, financial_year: fy },
      _sum: { tds_amount: true },
    });

    const grossWinnings = Number(winnings._sum.amount || 0);
    const totalEntryFees = Number(entryFees._sum.amount || 0);
    const netWinnings = Math.max(0, grossWinnings - totalEntryFees);
    const tdsAlreadyPaid = Number(tdsPaid._sum.tds_amount || 0);

    // Total TDS liability = 30% of net winnings
    const totalTdsLiability = netWinnings * this.TDS_RATE;
    // TDS still owed
    const tdsRemaining = Math.max(0, totalTdsLiability - tdsAlreadyPaid);

    // TDS on this withdrawal = min(remaining TDS, 30% of withdrawal amount)
    const tdsOnThisWithdrawal = Math.min(tdsRemaining, withdrawalAmount * this.TDS_RATE);
    const amountAfterTds = withdrawalAmount - tdsOnThisWithdrawal;

    return {
      grossWinnings,
      totalEntryFees,
      netWinnings,
      tdsAlreadyPaid,
      tdsOnThisWithdrawal: Math.round(tdsOnThisWithdrawal * 100) / 100,
      amountAfterTds: Math.round(amountAfterTds * 100) / 100,
    };
  }

  /**
   * Record TDS deduction after successful withdrawal
   */
  async recordTds(userId: string, tdsAmount: number, transactionId: string): Promise<void> {
    if (tdsAmount <= 0) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    // Get PAN from KYC
    const panDoc = await this.prisma.kycDocument.findFirst({
      where: { user_id: userId, document_type: 'PAN', status: 'APPROVED' },
      select: { document_number: true },
    });

    await this.prisma.tdsRecord.create({
      data: {
        user_id: userId,
        financial_year: this.getFinancialYear(),
        gross_winnings: 0, // Will be computed in reports
        net_winnings: 0,
        tds_rate: this.TDS_RATE,
        tds_amount: tdsAmount,
        transaction_id: transactionId,
        pan_number: panDoc?.document_number || null,
      },
    });
  }

  /**
   * Get FY start date
   */
  private getFyStartDate(): Date {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    if (month >= 3) {
      return new Date(year, 3, 1); // April 1 of this year
    }
    return new Date(year - 1, 3, 1); // April 1 of last year
  }

  /**
   * Get TDS summary for a user (for displaying in app/reports)
   */
  async getTdsSummary(userId: string) {
    const fy = this.getFinancialYear();
    const records = await this.prisma.tdsRecord.findMany({
      where: { user_id: userId, financial_year: fy },
      orderBy: { created_at: 'desc' },
    });

    const totalTds = records.reduce((sum, r) => sum + Number(r.tds_amount), 0);

    return {
      financial_year: fy,
      total_tds_deducted: totalTds,
      records: records.map(r => ({
        id: r.id,
        amount: Number(r.tds_amount),
        date: r.created_at,
      })),
    };
  }
}
