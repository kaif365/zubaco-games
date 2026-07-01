/**
 * SECTION 15 — TRANSACTION SEMANTICS (DATABASE-BACKED integration, Phase T4-A)
 *
 * Cross-cutting money-path guarantees against a REAL PostgreSQL + Redis:
 *   • Atomicity    — a failing operation leaves NO partial rows.
 *   • Rollback     — credit to a wallet-less user rolls back cleanly.
 *   • Idempotency  — a repeated idempotency key credits exactly once.
 *   • Concurrency  — N concurrent same-key requests collapse to a single apply.
 *   • Isolation    — N concurrent distinct credits never lose an update.
 *   • Duplicate    — settling a deposit twice never double-credits.
 *
 * (Deadlock testing is intentionally omitted: the ledger serialises money
 * mutations behind a Redis idempotency lock + a UNIQUE ledger_key, so a classic
 * two-transaction deadlock cannot be provoked deterministically here. This is
 * documented honestly rather than faked.)
 */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Harness, startHarness } from './harness';
import { createUser, createUserWithWallet, getBalances } from './prisma-test-util';
import { FinancialOperation } from '../../../src/wallet/ledger/ledger.types';

describe('Transaction semantics — DB integration', () => {
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

  describe('atomicity & rollback', () => {
    it('leaves no orphan transaction when crediting a wallet-less user', async () => {
      const { id } = await createUser(h.graph.prisma); // no wallet row

      await expect(
        h.graph.ledger.post({
          userId: id,
          operation: FinancialOperation.REWARD_CREDIT,
          amount: 100,
          idempotencyKey: 'rollback-1',
          reason: 'test',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      // Full rollback: no transaction persisted, no wallet conjured.
      expect(await h.graph.prisma.transaction.count({ where: { user_id: id } })).toBe(0);
      expect(await h.graph.prisma.wallet.count({ where: { user_id: id } })).toBe(0);
    });
  });

  describe('idempotency & concurrency', () => {
    it('credits exactly once for a repeated idempotency key', async () => {
      const user = await createUserWithWallet(h.graph.prisma, { balance: 0 });

      const a = await h.graph.ledger.post({
        userId: user.id,
        operation: FinancialOperation.REWARD_CREDIT,
        amount: 200,
        idempotencyKey: 'dup-key',
        reason: 'first',
      });
      // Release the in-progress Redis lock so the retry reaches the durable
      // storage-level guard (UNIQUE ledger_key) rather than the concurrent lock.
      await h.redisAdmin.del('wallet:ledger:dup-key');
      const b = await h.graph.ledger.post({
        userId: user.id,
        operation: FinancialOperation.REWARD_CREDIT,
        amount: 200,
        idempotencyKey: 'dup-key',
        reason: 'retry',
      });

      expect(a.applied).toBe(true);
      expect(b.duplicate).toBe(true);
      expect(Number((await getBalances(h.graph.prisma, user.id)).balance)).toBe(200);
      expect(await h.graph.prisma.transaction.count({ where: { user_id: user.id } })).toBe(1);
    });

    it('collapses N concurrent same-key requests to a single applied credit', async () => {
      const user = await createUserWithWallet(h.graph.prisma, { balance: 0 });

      const results = await Promise.allSettled(
        Array.from({ length: 10 }, () =>
          h.graph.ledger.post({
            userId: user.id,
            operation: FinancialOperation.REWARD_CREDIT,
            amount: 100,
            idempotencyKey: 'race-key',
            reason: 'concurrent',
          }),
        ),
      );

      const applied = results.filter(
        (r) => r.status === 'fulfilled' && r.value.applied && !r.value.duplicate,
      );
      const conflicts = results.filter(
        (r) => r.status === 'rejected' && r.reason instanceof ConflictException,
      );
      const duplicates = results.filter((r) => r.status === 'fulfilled' && r.value.duplicate);

      expect(applied.length).toBe(1);
      expect(conflicts.length + duplicates.length).toBe(9);
      expect(Number((await getBalances(h.graph.prisma, user.id)).balance)).toBe(100);
      expect(await h.graph.prisma.transaction.count({ where: { user_id: user.id } })).toBe(1);
    });

    it('preserves every update under N concurrent distinct credits (isolation)', async () => {
      const user = await createUserWithWallet(h.graph.prisma, { balance: 0 });

      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          h.graph.ledger.post({
            userId: user.id,
            operation: FinancialOperation.REWARD_CREDIT,
            amount: 50,
            idempotencyKey: `iso-${i}`,
            reason: 'concurrent-distinct',
          }),
        ),
      );

      const appliedCount = results.filter((r) => r.applied && !r.duplicate).length;
      expect(appliedCount).toBe(10);
      // No lost updates: final balance equals the sum of all applied credits.
      expect(Number((await getBalances(h.graph.prisma, user.id)).balance)).toBe(500);
      expect(await h.graph.prisma.transaction.count({ where: { user_id: user.id } })).toBe(10);
    });
  });

  describe('duplicate execution prevention', () => {
    it('never double-credits when a deposit is settled twice', async () => {
      const user = await createUserWithWallet(h.graph.prisma, { balance: 0 });
      await h.graph.ledger.createPendingDeposit({
        userId: user.id,
        amount: 1000,
        referenceId: 'order-xyz',
      });

      const first = await h.graph.ledger.settleDeposit('order-xyz', 'pay-1');
      const second = await h.graph.ledger.settleDeposit('order-xyz', 'pay-1');

      expect(first.applied).toBe(true);
      expect(second.duplicate).toBe(true);
      expect(Number((await getBalances(h.graph.prisma, user.id)).balance)).toBe(1000);
    });
  });
});
