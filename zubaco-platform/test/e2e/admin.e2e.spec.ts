/**
 * Phase T4-B — Section J: ADMIN CONTROL PLANE (real HTTP, signed).
 *
 * The admin control plane is protected by `ServiceIdentityGuard` (HMAC-signed
 * service-to-service auth), NOT JWT. These tests compute GENUINE signatures with
 * the same canonicalisation the guard verifies, then drive the single
 * authoritative `/admin/control-plane/execute` route over REAL HTTP: RBAC
 * enforcement, real wallet-ledger side-effects, request idempotency, anti-cheat
 * enforcement, and the immutable audit trail. Unsigned/tampered requests are
 * rejected by the guard.
 */
import request from 'supertest';
import { bootE2EApp, E2EApp } from './e2e-app';
import { API } from './helpers/http-auth';
import { signServiceRequest } from './helpers/service-identity';
import { AdminAction, AdminRole } from '../../src/admin/control-plane/admin.types';
import { EnforcementAction } from '../../src/anti-cheat/enforcement/enforcement.types';

const EXEC_PATH = `${API}/admin/control-plane/execute`;

/** POST a signed admin command. */
function execute(e2e: E2EApp, body: Record<string, unknown>) {
  return request(e2e.http)
    .post(EXEC_PATH)
    .set(signServiceRequest('POST', EXEC_PATH, body))
    .send(body);
}

describe('E2E · Section J — Admin Control Plane', () => {
  let e2e: E2EApp;

  beforeAll(async () => {
    e2e = await bootE2EApp();
  });

  afterAll(async () => {
    await e2e.close();
  });

  beforeEach(async () => {
    await e2e.reset();
  });

  async function seedTargetWallet(balance = 0): Promise<string> {
    const suffix = Math.random().toString(36).slice(2, 10);
    const u = await e2e.prisma.user.create({
      data: { username: `t_${suffix}`, phone: `+9197${suffix.slice(0, 8)}` },
    });
    await e2e.prisma.wallet.create({ data: { user_id: u.id, balance } });
    return u.id;
  }

  it('rejects an UNSIGNED admin request (401)', async () => {
    const body = {
      adminId: 'fin-1',
      role: AdminRole.FINANCE,
      action: AdminAction.CREDIT_WALLET,
      requestId: 'r-unsigned',
      target: 'someone',
      reason: 'test',
      params: { amount: 100 },
    };
    const res = await request(e2e.http).post(EXEC_PATH).send(body);
    expect(res.status).toBe(401);
  });

  it('rejects a TAMPERED signature (401)', async () => {
    const target = await seedTargetWallet();
    const body = {
      adminId: 'fin-1',
      role: AdminRole.FINANCE,
      action: AdminAction.CREDIT_WALLET,
      requestId: 'r-tamper',
      target,
      reason: 'test',
      params: { amount: 100 },
    };
    const headers = signServiceRequest('POST', EXEC_PATH, body);
    headers['x-signature'] = 'deadbeef';
    const res = await request(e2e.http).post(EXEC_PATH).set(headers).send(body);
    expect(res.status).toBe(401);
  });

  it('credits a wallet through the ledger for a FINANCE admin (real side-effect)', async () => {
    const target = await seedTargetWallet(0);
    const res = await execute(e2e, {
      adminId: 'fin-1',
      role: AdminRole.FINANCE,
      action: AdminAction.CREDIT_WALLET,
      requestId: 'r-credit',
      target,
      reason: 'goodwill',
      params: { amount: 500 },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, duplicate: false });

    const wallet = await e2e.prisma.wallet.findUnique({ where: { user_id: target } });
    expect(Number(wallet!.balance)).toBe(500);
  });

  it('enforces RBAC — a READ_ONLY admin cannot credit wallets (403)', async () => {
    const target = await seedTargetWallet(0);
    const res = await execute(e2e, {
      adminId: 'ro-1',
      role: AdminRole.READ_ONLY,
      action: AdminAction.CREDIT_WALLET,
      requestId: 'r-deny',
      target,
      reason: 'nope',
      params: { amount: 100 },
    });
    expect(res.status).toBe(403);

    const wallet = await e2e.prisma.wallet.findUnique({ where: { user_id: target } });
    expect(Number(wallet!.balance)).toBe(0);
  });

  it('is idempotent on requestId — no double credit', async () => {
    const target = await seedTargetWallet(0);
    const body = {
      adminId: 'fin-1',
      role: AdminRole.FINANCE,
      action: AdminAction.CREDIT_WALLET,
      requestId: 'r-idem',
      target,
      reason: 'goodwill',
      params: { amount: 250 },
    };

    const first = await execute(e2e, body);
    const second = await execute(e2e, body);
    expect(first.body.duplicate).toBe(false);
    expect(second.body.duplicate).toBe(true);

    const wallet = await e2e.prisma.wallet.findUnique({ where: { user_id: target } });
    expect(Number(wallet!.balance)).toBe(250);
  });

  it('enforces anti-cheat (bans the target) for a SUPER_ADMIN', async () => {
    const target = await seedTargetWallet(0);
    const res = await execute(e2e, {
      adminId: 'root',
      role: AdminRole.SUPER_ADMIN,
      action: AdminAction.ENFORCE_ANTI_CHEAT,
      requestId: 'r-ban',
      target,
      reason: 'confirmed cheat',
      params: { actions: [EnforcementAction.INVALIDATE_REWARDS], confirmed: true },
    });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);

    const user = await e2e.prisma.user.findUnique({ where: { id: target } });
    expect(user!.is_banned).toBe(true);
  });

  it('records an immutable audit entry (GET /admin/control-plane/audit)', async () => {
    const target = await seedTargetWallet(0);
    await execute(e2e, {
      adminId: 'fin-1',
      role: AdminRole.FINANCE,
      action: AdminAction.CREDIT_WALLET,
      requestId: 'r-audit',
      target,
      reason: 'goodwill',
      params: { amount: 10 },
    });

    const auditPath = `${API}/admin/control-plane/audit?limit=50`;
    const res = await request(e2e.http)
      .get(auditPath)
      .set(signServiceRequest('GET', auditPath));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const entry = res.body.find((e: any) => e.requestId === 'r-audit');
    expect(entry).toBeTruthy();
    expect(entry.outcome).toBe('OK');
    expect(entry.adminId).toBe('fin-1');
  });

  it('rejects a malformed command body via DTO validation (400)', async () => {
    const body = {
      adminId: 'fin-1',
      role: 'NOT_A_ROLE',
      action: AdminAction.CREDIT_WALLET,
      requestId: 'r-bad',
      target: 'x',
      reason: 'y',
    };
    const res = await execute(e2e, body);
    expect(res.status).toBe(400);
  });
});
