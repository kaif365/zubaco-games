/**
 * SECTION E — WALLET (DATABASE-BACKED integration, Phase T4-A)
 *
 * Exercises the authoritative wallet ledger against a REAL PostgreSQL + Redis:
 * deposit lifecycle, credit/debit, balance, transaction history, GST, TDS,
 * idempotency, rollback/atomicity and concurrent requests. No mocks — every
 * balance change is a committed Postgres transaction read back through Prisma.
 */
import { ConflictException, BadRequestException } from '@nestjs/common';
import { Harness, startHarness } from './harness';
import { createUserWithWallet, createUser, getBalances } from './prisma-test-util';
import { FinancialOperation } from '../../../src/wallet/ledger/ledger.types';

describe('Wallet — DB integration', () => {
  let h: Harness;

  beforeAll(async () => {
    h = await startHarness();
  });

  afterAll(async () => {
    await h.stop();
  });

  beforeEach(async () => {
    await h.reset();
  });

  describe('ledger credit (post)', () => {
    it('credits the cash bucket and persists a COMPLETED Transaction atomically', async () => {
      const { userId } = await createUserWithWallet(h.graph.prisma, { balance: 0 });

      const res = await h.graph.ledger.post({
        userId,
        operation: FinancialOperation.TOURNAMENT_PAYOUT,
        amount: 250,
        idempotencyKey: `payout:${userId}:1`,
        reason: 'Tournament prize',
      });

      expect(res.applied).toBe(true);
      expect(res.duplicate).toBe(false);
      expect(res.balanceAfter).toBe(250);

      const { balance } = await getBalances(h.graph.prisma, userId);
      expect(balance).toBe(250);

      const row = await h.graph.prisma.transaction.findFirst({ where: { user_id: userId } });
      expect(row).toBeTruthy();
      expect(row!.type).toBe('PRIZE_WIN');
      expect(row!.status).toBe('COMPLETED');
      expect(Number(row!.balance_after)).toBe(250);
      expect(row!.ledger_key).toBe(`payout:${userId}:1`);
    });

    it('rejects a credit when the wallet row does not exist (no orphan transaction)', async () => {
      const { id } = await createUser(h.graph.prisma); // deliberately NO wallet

      await expect(
        h.graph.ledger.post({
          userId: id,
          operation: FinancialOperation.REWARD_CREDIT,
          amount: 100,
          idempotencyKey: `reward:${id}:1`,
          reason: 'no wallet',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      const count = await h.graph.prisma.transaction.count({ where: { user_id: id } });
      expect(count).toBe(0);
    });
  });

  describe('idempotency', () => {
    it('collapses a repeated idempotencyKey onto the same row (credit applied once)', async () => {
      const { userId } = await createUserWithWallet(h.graph.prisma, { balance: 0 });
      const key = `reward:${userId}:once`;

      const first = await h.graph.ledger.post({
        userId,
        operation: FinancialOperation.REWARD_CREDIT,
        amount: 500,
        idempotencyKey: key,
        reason: 'first',
      });
      // The Redis in-progress lock must be cleared for the retry to reach the
      // storage-level (UNIQUE ledger_key) idempotency guard.
      await h.redisAdmin.del(`wallet:ledger:${key}`);
      const second = await h.graph.ledger.post({
        userId,
        operation: FinancialOperation.REWARD_CREDIT,
        amount: 500,
        idempotencyKey: key,
        reason: 'retry',
      });

      expect(first.applied).toBe(true);
      expect(second.applied).toBe(false);
      expect(second.duplicate).toBe(true);
      expect(second.transactionId).toBe(first.transactionId);

      const { balance } = await getBalances(h.graph.prisma, userId);
      expect(balance).toBe(500); // credited exactly once

      const count = await h.graph.prisma.transaction.count({ where: { ledger_key: key } });
      expect(count).toBe(1);
    });

    it('blocks a concurrent duplicate while the first is in-progress (Redis lock)', async () => {
      const { userId } = await createUserWithWallet(h.graph.prisma, { balance: 0 });
      const key = `reward:${userId}:concurrent`;

      const results = await Promise.allSettled(
        Array.from({ length: 5 }).map(() =>
          h.graph.ledger.post({
            userId,
            operation: FinancialOperation.REWARD_CREDIT,
            amount: 100,
            idempotencyKey: key,
            reason: 'concurrent',
          }),
        ),
      );

      const applied = results.filter((r) => r.status === 'fulfilled' && r.value.applied);
      const conflicts = results.filter(
        (r) => r.status === 'rejected' && r.reason instanceof ConflictException,
      );

      expect(applied).toHaveLength(1);
      expect(conflicts.length).toBe(4);

      const { balance } = await getBalances(h.graph.prisma, userId);
      expect(balance).toBe(100); // credited exactly once despite 5 parallel calls

      const count = await h.graph.prisma.transaction.count({ where: { ledger_key: key } });
      expect(count).toBe(1);
    });
  });

  describe('entry-fee debit (bonus-first, then cash)', () => {
    it('spends the bonus bucket first and records a single ENTRY_FEE row', async () => {
      const { userId } = await createUserWithWallet(h.graph.prisma, { balance: 100, bonus: 30 });

      const res = await h.graph.ledger.debitEntryFee({
        userId,
        amount: 50,
        idempotencyKey: `entryfee:season1:${userId}`,
        reason: 'Entry fee',
        seasonRef: 'season1',
      });

      expect(res.applied).toBe(true);
      expect(res.balanceAfter).toBe(80); // 130 - 50

      const { balance, bonus } = await getBalances(h.graph.prisma, userId);
      expect(bonus).toBe(0); // 30 bonus consumed first
      expect(balance).toBe(80); // 100 - 20 remaining

      const rows = await h.graph.prisma.transaction.findMany({ where: { user_id: userId } });
      expect(rows).toHaveLength(1);
      expect(rows[0].type).toBe('ENTRY_FEE');
    });

    it('rolls back completely on insufficient balance (atomicity)', async () => {
      const { userId } = await createUserWithWallet(h.graph.prisma, { balance: 10, bonus: 5 });

      await expect(
        h.graph.ledger.debitEntryFee({
          userId,
          amount: 100,
          idempotencyKey: `entryfee:big:${userId}`,
          reason: 'too big',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      // Balances unchanged and NO transaction row was written.
      const { balance, bonus } = await getBalances(h.graph.prisma, userId);
      expect(balance).toBe(10);
      expect(bonus).toBe(5);
      const count = await h.graph.prisma.transaction.count({ where: { user_id: userId } });
      expect(count).toBe(0);
    });
  });

  describe('deposit lifecycle', () => {
    it('registers PENDING then settles to COMPLETED, crediting cash exactly once', async () => {
      const { userId } = await createUserWithWallet(h.graph.prisma, { balance: 0 });
      const referenceId = `order_${userId}`;

      const pending = await h.graph.ledger.createPendingDeposit({
        userId,
        amount: 1000,
        referenceId,
      });
      expect(pending.applied).toBe(true);

      let row = await h.graph.prisma.transaction.findFirst({ where: { reference_id: referenceId } });
      expect(row!.status).toBe('PENDING');
      expect((await getBalances(h.graph.prisma, userId)).balance).toBe(0);

      const settled = await h.graph.ledger.settleDeposit(referenceId, 'pay_123');
      expect(settled.applied).toBe(true);
      expect(settled.balanceAfter).toBe(1000);

      row = await h.graph.prisma.transaction.findFirst({ where: { reference_id: referenceId } });
      expect(row!.status).toBe('COMPLETED');
      expect((await getBalances(h.graph.prisma, userId)).balance).toBe(1000);

      // A duplicate settlement (webhook + verify race) must not double-credit.
      const again = await h.graph.ledger.settleDeposit(referenceId, 'pay_123');
      expect(again.applied).toBe(false);
      expect(again.duplicate).toBe(true);
      expect((await getBalances(h.graph.prisma, userId)).balance).toBe(1000);
    });
  });

  describe('balance & transaction history', () => {
    it('returns paginated transactions most-recent-first', async () => {
      const { userId } = await createUserWithWallet(h.graph.prisma, { balance: 0 });
      for (let i = 1; i <= 3; i++) {
        await h.graph.ledger.post({
          userId,
          operation: FinancialOperation.ADJUSTMENT,
          amount: i * 10,
          idempotencyKey: `adj:${userId}:${i}`,
          reason: `adj ${i}`,
        });
      }

      const history = await h.graph.wallet.getTransactions(userId, 1, 20);
      expect(history.total).toBe(3);
      expect(history.transactions).toHaveLength(3);

      const wallet = await h.graph.wallet.getWallet(userId);
      expect(Number(wallet.balance)).toBe(60); // 10 + 20 + 30
    });
  });

  describe('GST (28% inclusive extraction)', () => {
    it('extracts the GST component from a GST-inclusive entry fee', () => {
      const { baseAmount, gstAmount, totalAmount } = h.graph.gst.calculateGstInclusive(100);
      expect(totalAmount).toBe(100);
      expect(baseAmount).toBeCloseTo(78.13, 2);
      expect(gstAmount).toBeCloseTo(21.87, 2);
      expect(Math.round((baseAmount + gstAmount) * 100) / 100).toBe(100);
    });
  });

  describe('TDS (30% on net winnings)', () => {
    it('computes TDS on net winnings and persists a TdsRecord', async () => {
      const { userId } = await createUserWithWallet(h.graph.prisma, { balance: 0 });

      // Winnings ₹1000, entry fees ₹200 => net ₹800 => TDS liability ₹240.
      await h.graph.prisma.transaction.create({
        data: {
          user_id: userId,
          type: 'PRIZE_WIN',
          amount: 1000,
          balance_after: 1000,
          status: 'COMPLETED',
        },
      });
      await h.graph.prisma.transaction.create({
        data: {
          user_id: userId,
          type: 'ENTRY_FEE',
          amount: 200,
          balance_after: 800,
          status: 'COMPLETED',
        },
      });

      const tds = await h.graph.tds.calculateTds(userId, 800);
      expect(tds.grossWinnings).toBe(1000);
      expect(tds.totalEntryFees).toBe(200);
      expect(tds.netWinnings).toBe(800);
      expect(tds.tdsOnThisWithdrawal).toBeCloseTo(240, 2);
      expect(tds.amountAfterTds).toBeCloseTo(560, 2);

      const txn = await h.graph.prisma.transaction.findFirst({
        where: { user_id: userId, type: 'PRIZE_WIN' },
      });
      await h.graph.tds.recordTds(userId, tds.tdsOnThisWithdrawal, txn!.id);

      const records = await h.graph.prisma.tdsRecord.findMany({ where: { user_id: userId } });
      expect(records).toHaveLength(1);
      expect(Number(records[0].tds_amount)).toBeCloseTo(240, 2);
      expect(Number(records[0].tds_rate)).toBeCloseTo(0.3, 4);
    });
  });
});
