import { TdsService } from './tds.service';

/**
 * Unit tests for TdsService — 30% TDS on NET winnings at withdrawal.
 * Prisma is mocked; we verify the money math, the per-withdrawal cap, the
 * already-paid offset (idempotency across withdrawals) and 2-decimal rounding.
 */
describe('TdsService', () => {
  let service: TdsService;
  let prisma: {
    transaction: { aggregate: jest.Mock };
    tdsRecord: { aggregate: jest.Mock; findMany: jest.Mock };
  };

  /** Configure aggregate results: winnings, then entry fees, then TDS paid. */
  const mockAggregates = (gross: number, fees: number, tdsPaid: number) => {
    prisma.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: gross } })
      .mockResolvedValueOnce({ _sum: { amount: fees } });
    prisma.tdsRecord.aggregate.mockResolvedValueOnce({ _sum: { tds_amount: tdsPaid } });
  };

  beforeEach(() => {
    prisma = {
      transaction: { aggregate: jest.fn() },
      tdsRecord: { aggregate: jest.fn(), findMany: jest.fn() },
    };
    service = new TdsService(prisma as any);
  });

  describe('calculateTds', () => {
    it('deducts 30% of the withdrawal when liability exceeds it', async () => {
      mockAggregates(1000, 200, 0); // net = 800, liability = 240
      const r = await service.calculateTds('u1', 500);
      expect(r.netWinnings).toBe(800);
      expect(r.tdsOnThisWithdrawal).toBe(150); // min(240, 30% of 500)
      expect(r.amountAfterTds).toBe(350);
    });

    it('caps the deduction at the remaining liability', async () => {
      mockAggregates(1000, 900, 0); // net = 100, liability = 30
      const r = await service.calculateTds('u1', 500);
      expect(r.tdsOnThisWithdrawal).toBe(30); // min(30, 150)
      expect(r.amountAfterTds).toBe(470);
    });

    it('subtracts TDS already paid this financial year', async () => {
      mockAggregates(1000, 0, 250); // net = 1000, liability = 300, paid = 250 -> remaining 50
      const r = await service.calculateTds('u1', 500);
      expect(r.tdsAlreadyPaid).toBe(250);
      expect(r.tdsOnThisWithdrawal).toBe(50); // min(50, 150)
      expect(r.amountAfterTds).toBe(450);
    });

    it('floors net winnings at zero when entry fees exceed winnings', async () => {
      mockAggregates(100, 500, 0); // net = 0
      const r = await service.calculateTds('u1', 500);
      expect(r.netWinnings).toBe(0);
      expect(r.tdsOnThisWithdrawal).toBe(0);
      expect(r.amountAfterTds).toBe(500);
    });

    it('rounds TDS and net amount to two decimals', async () => {
      mockAggregates(333.33, 0, 0); // net = 333.33, liability = 99.999
      const r = await service.calculateTds('u1', 33.33);
      expect(r.tdsOnThisWithdrawal).toBe(10); // round(9.999) = 10
      expect(r.amountAfterTds).toBe(23.33);
    });
  });

  describe('getTdsSummary', () => {
    it('sums TDS records and reports a valid financial year', async () => {
      prisma.tdsRecord.findMany.mockResolvedValue([
        { id: 'a', tds_amount: 50, created_at: new Date() },
        { id: 'b', tds_amount: 25.5, created_at: new Date() },
      ]);
      const summary = await service.getTdsSummary('u1');
      expect(summary.total_tds_deducted).toBe(75.5);
      expect(summary.records).toHaveLength(2);
      expect(summary.financial_year).toMatch(/^\d{4}-\d{2}$/);
    });
  });
});
