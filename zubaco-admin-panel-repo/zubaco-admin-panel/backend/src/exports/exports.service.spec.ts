import { ExportsService } from './exports.service';

describe('ExportsService - Financial Ledger Audit & Section 194BA TDS (Module 6.5)', () => {
  let service: ExportsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: jest.fn(),
      },
      wallet: {
        findMany: jest.fn(),
      },
      transaction: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      seasonLeaderboard: {
        findMany: jest.fn(),
      },
    };

    service = new ExportsService(mockPrisma);
  });

  describe('Zero-Sum Ledger Integrity Verification', () => {
    it('should verify balanced ledger when total wallet balance matches net transaction flow', async () => {
      // 3 wallets with total balance of 1500
      mockPrisma.wallet.findMany.mockResolvedValue([
        { balance: 500 },
        { balance: 700 },
        { balance: 300 },
      ]);

      // Net transactions:
      // Credits: Deposits (2000) + Prize Wins (500) = 2500
      // Debits: Withdrawals (800) + Entry Fees (200) = 1000
      // Net = 2500 - 1000 = 1500
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { type: 'DEPOSIT', _sum: { amount: 2000 } },
        { type: 'PRIZE_WIN', _sum: { amount: 500 } },
        { type: 'WITHDRAWAL', _sum: { amount: 800 } },
        { type: 'ENTRY_FEE', _sum: { amount: 200 } },
      ]);

      const result = await service.verifyLedgerIntegrity();

      expect(result.balanced).toBe(true);
      expect(result.total_wallet_balance).toBe(1500);
      expect(result.net_ledger_balance).toBe(1500);
      expect(result.variance).toBe(0);
    });

    it('should flag unbalanced ledger when discrepancies occur', async () => {
      mockPrisma.wallet.findMany.mockResolvedValue([{ balance: 2000 }]);
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { type: 'DEPOSIT', _sum: { amount: 1500 } },
      ]);

      const result = await service.verifyLedgerIntegrity();

      expect(result.balanced).toBe(false);
      expect(result.total_wallet_balance).toBe(2000);
      expect(result.net_ledger_balance).toBe(1500);
      expect(result.variance).toBe(500);
    });
  });

  describe('Gross Gaming Revenue (GGR) & Platform Rake Metrics', () => {
    it('should calculate GGR and platform rake percentage correctly', async () => {
      // Entry fees = 10,000, Prize payouts = 8,000 => GGR = 2,000 (20% rake)
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { type: 'ENTRY_FEE', _sum: { amount: 10000 } },
        { type: 'PRIZE_WIN', _sum: { amount: 8000 } },
      ]);

      const result = await service.getGgrAndRevenueMetrics();

      expect(result.total_entry_fees).toBe(10000);
      expect(result.total_prizes_distributed).toBe(8000);
      expect(result.gross_gaming_revenue_ggr).toBe(2000);
      expect(result.platform_rake_pct).toBe(20);
    });
  });

  describe('Indian Section 194BA 30% TDS Summary Report', () => {
    it('should compute 30% withholding on gaming prize winnings', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: 10000 },
        { amount: 50000 },
      ]);

      const result = await service.getTdsSummaryReport();

      expect(result.statutory_tds_rate_pct).toBe(30);
      expect(result.total_taxable_winnings).toBe(60000);
      expect(result.total_tds_withheld).toBe(18000); // 30% of 60,000
      expect(result.payout_transactions_count).toBe(2);
    });
  });

  describe('Government Tax Sheet Export (Section 194BA CSV)', () => {
    it('should generate compliant CSV with gross winnings, 30% TDS, and net disbursed', async () => {
      const prizeTxs = [
        {
          id: 'tx-1',
          user_id: 'usr-1',
          amount: 10000,
          reference_id: 'prize:s1:usr1',
          created_at: new Date('2026-11-04T12:00:00.000Z'),
          user: {
            id: 'usr-1',
            username: 'winner_vikram',
            display_name: 'Vikram Sharma',
            email: 'vikram@example.com',
            phone: '+919876543210',
          },
        },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(prizeTxs);

      const csv = await service.exportSection194BaTdsCsv();

      const lines = csv.split('\n');
      expect(lines[0]).toBe(
        'user_id,username,display_name,email,gross_winnings,tds_rate_pct,tds_withheld,net_disbursed,reference_id,transaction_date',
      );
      expect(lines[1]).toContain('usr-1,winner_vikram,Vikram Sharma,vikram@example.com,10000,30%,3000,7000,prize:s1:usr1');
    });
  });
});
