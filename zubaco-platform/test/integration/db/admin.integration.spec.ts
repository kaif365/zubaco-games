/**
 * SECTION J — ADMIN CONTROL PLANE (DATABASE-BACKED integration, Phase T4-A)
 *
 * Real AdminControlPlaneService against a REAL PostgreSQL + Redis. Admin actions
 * orchestrate the authoritative pipelines (wallet ledger, anti-cheat enforcement)
 * rather than mutating money tables directly. Covers RBAC (least privilege),
 * request idempotency, real DB side-effects and the immutable audit trail.
 *
 * NOTE (honest scoping): the audit trail is stored in Redis (append-only zset),
 * not a Postgres table — there is intentionally no DB model for it. It is still
 * exercised here against the REAL Redis instance.
 */
import { ForbiddenException } from '@nestjs/common';
import { Harness, startHarness } from './harness';
import { createUser, createUserWithWallet, getBalances } from './prisma-test-util';
import { AdminAction, AdminRole } from '../../../src/admin/control-plane/admin.types';
import { EnforcementAction } from '../../../src/anti-cheat/enforcement/enforcement.types';

describe('Admin Control Plane — DB integration', () => {
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

  describe('RBAC (least privilege)', () => {
    it('denies an action outside the actor\'s role', async () => {
      const target = await createUserWithWallet(h.graph.prisma, { balance: 0 });

      await expect(
        h.graph.admin.execute(
          { adminId: 'a1', role: AdminRole.READ_ONLY },
          { action: AdminAction.CREDIT_WALLET, requestId: 'r-deny', target: target.id, reason: 'x', params: { amount: 100 } },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      // Nothing was credited.
      expect(Number((await getBalances(h.graph.prisma, target.id)).balance)).toBe(0);
    });
  });

  describe('CREDIT_WALLET (real ledger side-effect)', () => {
    it('credits the target wallet through the ledger', async () => {
      const target = await createUserWithWallet(h.graph.prisma, { balance: 0 });

      const res = await h.graph.admin.execute(
        { adminId: 'fin-1', role: AdminRole.FINANCE },
        { action: AdminAction.CREDIT_WALLET, requestId: 'r-credit', target: target.id, reason: 'goodwill', params: { amount: 500 } },
      );
      expect(res.ok).toBe(true);
      expect(res.duplicate).toBe(false);

      expect(Number((await getBalances(h.graph.prisma, target.id)).balance)).toBe(500);
      const txns = await h.graph.prisma.transaction.count({ where: { user_id: target.id, status: 'COMPLETED' } });
      expect(txns).toBe(1);
    });

    it('is idempotent on requestId — no double credit', async () => {
      const target = await createUserWithWallet(h.graph.prisma, { balance: 0 });
      const cmd = {
        action: AdminAction.CREDIT_WALLET,
        requestId: 'r-idem',
        target: target.id,
        reason: 'goodwill',
        params: { amount: 250 },
      };

      const first = await h.graph.admin.execute({ adminId: 'fin-1', role: AdminRole.FINANCE }, cmd);
      const second = await h.graph.admin.execute({ adminId: 'fin-1', role: AdminRole.FINANCE }, cmd);

      expect(first.duplicate).toBe(false);
      expect(second.duplicate).toBe(true);
      expect(Number((await getBalances(h.graph.prisma, target.id)).balance)).toBe(250);
    });
  });

  describe('ENFORCE_ANTI_CHEAT (real enforcement side-effect)', () => {
    it('bans the target user via the enforcement engine', async () => {
      const target = await createUser(h.graph.prisma);

      const res = await h.graph.admin.execute(
        { adminId: 'root', role: AdminRole.SUPER_ADMIN },
        {
          action: AdminAction.ENFORCE_ANTI_CHEAT,
          requestId: 'r-ban',
          target: target.id,
          reason: 'confirmed cheat',
          params: { actions: [EnforcementAction.INVALIDATE_REWARDS] },
        },
      );
      expect(res.ok).toBe(true);

      const user = await h.graph.prisma.user.findUnique({ where: { id: target.id } });
      expect(user!.is_banned).toBe(true);
    });
  });

  describe('audit trail', () => {
    it('records an immutable audit entry for every executed action', async () => {
      const target = await createUserWithWallet(h.graph.prisma, { balance: 0 });
      await h.graph.admin.execute(
        { adminId: 'fin-1', role: AdminRole.FINANCE },
        { action: AdminAction.CREDIT_WALLET, requestId: 'r-audit', target: target.id, reason: 'goodwill', params: { amount: 10 } },
      );

      const trail = await h.graph.admin.getAuditTrail(50);
      const entry = trail.find((e) => e.requestId === 'r-audit');
      expect(entry).toBeTruthy();
      expect(entry!.outcome).toBe('OK');
      expect(entry!.action).toBe(AdminAction.CREDIT_WALLET);
      expect(entry!.adminId).toBe('fin-1');
    });
  });
});
