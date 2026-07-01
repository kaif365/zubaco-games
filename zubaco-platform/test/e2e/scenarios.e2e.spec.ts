/**
 * Phase T4-B — Section L: SCENARIO TESTS (real HTTP, complete user journeys).
 *
 * Each journey stitches multiple controllers, guards and the real service graph
 * together over REAL HTTP against REAL PostgreSQL + Redis — exactly as a client
 * would drive the platform. Only external providers (SMS, and the money-in/out
 * payment gateway) are stubbed/omitted; every business decision, DB write and
 * authorisation check is genuine.
 *
 *   J1  Register → Login → Start Game → Submit → Verification → Leaderboard
 *   J2  Register Tournament → Reward (admin) → Wallet Credit → User sees balance
 *   J3  Cheat state → Enforcement (admin) → Ban → Leaderboard removal
 *   J4  Admin action → Wallet credit → Immutable audit trail
 *   J5  Wallet ledger → Transaction history (settled rows) over HTTP
 */
import request from 'supertest';
import { bootE2EApp, E2EApp } from './e2e-app';
import { API, bearer, registerAndLogin } from './helpers/http-auth';
import { signServiceRequest } from './helpers/service-identity';
import { AdminAction, AdminRole } from '../../src/admin/control-plane/admin.types';
import { EnforcementAction } from '../../src/anti-cheat/enforcement/enforcement.types';

const GAME = 'SLIDING_PUZZLE';

function execAdmin(e2e: E2EApp, body: Record<string, unknown>) {
  const path = `${API}/admin/control-plane/execute`;
  return request(e2e.http).post(path).set(signServiceRequest('POST', path, body)).send(body);
}

describe('E2E · Section L — Scenario Journeys', () => {
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

  it('J1 · Register → Login → Play → Submit → Verification → Leaderboard', async () => {
    const u = await registerAndLogin(e2e.http, e2e.sms);

    const start = await request(e2e.http)
      .post(`${API}/game-session/start`)
      .set(bearer(u.accessToken))
      .send({ game_type: GAME, config: {} })
      .expect(201);
    const sessionId = start.body.gameSessionId;

    const submit = await request(e2e.http)
      .post(`${API}/game-session/${sessionId}/submit`)
      .set(bearer(u.accessToken))
      .send({ score: 100, duration_ms: 2000, metadata: { rounds: [] } })
      .expect(201);
    expect(submit.body.success).toBe(true);

    // Verification verdict persisted authoritatively.
    const row = await e2e.prisma.gameSession.findUnique({ where: { id: sessionId } });
    expect(row!.outcome).toBe('COMPLETED');
    expect((row!.metadata as any)?._verification).toBeTruthy();

    // Leaderboard is reachable and consistent for the player.
    const board = await request(e2e.http).get(`${API}/leaderboard/game/${GAME}`).set(bearer(u.accessToken));
    expect(board.status).toBe(200);
    const mine = await request(e2e.http).get(`${API}/leaderboard/game/${GAME}/me`).set(bearer(u.accessToken));
    expect(mine.status).toBe(200);
  });

  it('J2 · Register Tournament → Reward payout (admin) → Wallet credit visible to user', async () => {
    const u = await registerAndLogin(e2e.http, e2e.sms);
    await e2e.prisma.wallet.create({ data: { user_id: u.userId, balance: 0 } });

    const season = await e2e.prisma.season.create({
      data: {
        name: 'Season Cup',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 86400000),
        status: 'REGISTRATION',
      },
    });

    await request(e2e.http)
      .post(`${API}/tournament/seasons/${season.id}/register`)
      .set(bearer(u.accessToken))
      .expect(201);

    // Authoritative prize credit through the admin control plane (finance).
    const reward = await execAdmin(e2e, {
      adminId: 'fin-1',
      role: AdminRole.FINANCE,
      action: AdminAction.CREDIT_WALLET,
      requestId: `reward-${season.id}`,
      target: u.userId,
      reason: 'tournament prize',
      params: { amount: 1000 },
    });
    expect(reward.status).toBe(201);
    expect(reward.body.ok).toBe(true);

    // The user observes the credited balance over HTTP.
    const wallet = await request(e2e.http).get(`${API}/wallet`).set(bearer(u.accessToken)).expect(200);
    expect(Number(wallet.body.balance)).toBe(1000);
  });

  it('J3 · Enforcement → Ban → Leaderboard score removed', async () => {
    // A cheating player with a live game session and a leaderboard score.
    const suffix = Math.random().toString(36).slice(2, 10);
    const cheater = await e2e.prisma.user.create({
      data: { username: `x_${suffix}`, phone: `+9195${suffix.slice(0, 8)}` },
    });
    const session = await e2e.prisma.gameSession.create({
      data: { user_id: cheater.id, game_type: GAME as any, mode: 'FREE_PLAY', server_seed: 'seed', config: {} },
    });
    await e2e.redisAdmin.zadd(`lb:game:${GAME}:all-time`, 1500, cheater.id);
    expect(await e2e.redisAdmin.zscore(`lb:game:${GAME}:all-time`, cheater.id)).toBe('1500');

    const res = await execAdmin(e2e, {
      adminId: 'root',
      role: AdminRole.SUPER_ADMIN,
      action: AdminAction.ENFORCE_ANTI_CHEAT,
      requestId: `enforce-${session.id}`,
      target: cheater.id,
      reason: 'confirmed cheat',
      params: {
        actions: [EnforcementAction.REMOVE_LEADERBOARD_SCORE, EnforcementAction.INVALIDATE_REWARDS],
        sessionId: session.id,
        confirmed: true,
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);

    // Atomic outcome: user banned AND leaderboard score removed.
    const user = await e2e.prisma.user.findUnique({ where: { id: cheater.id } });
    expect(user!.is_banned).toBe(true);
    expect(await e2e.redisAdmin.zscore(`lb:game:${GAME}:all-time`, cheater.id)).toBeNull();
  });

  it('J4 · Admin credit → Wallet side-effect → Immutable audit trail', async () => {
    const suffix = Math.random().toString(36).slice(2, 10);
    const target = await e2e.prisma.user.create({
      data: { username: `a_${suffix}`, phone: `+9194${suffix.slice(0, 8)}` },
    });
    await e2e.prisma.wallet.create({ data: { user_id: target.id, balance: 0 } });

    const credit = await execAdmin(e2e, {
      adminId: 'fin-9',
      role: AdminRole.FINANCE,
      action: AdminAction.CREDIT_WALLET,
      requestId: 'journey-j4',
      target: target.id,
      reason: 'support goodwill',
      params: { amount: 300 },
    });
    expect(credit.status).toBe(201);

    const wallet = await e2e.prisma.wallet.findUnique({ where: { user_id: target.id } });
    expect(Number(wallet!.balance)).toBe(300);

    const auditPath = `${API}/admin/control-plane/audit?limit=50`;
    const audit = await request(e2e.http).get(auditPath).set(signServiceRequest('GET', auditPath)).expect(200);
    const entry = audit.body.find((row: any) => row.requestId === 'journey-j4');
    expect(entry).toBeTruthy();
    expect(entry.outcome).toBe('OK');
    expect(entry.action).toBe(AdminAction.CREDIT_WALLET);
  });

  it('J5 · Wallet ledger → Transaction history over HTTP', async () => {
    const u = await registerAndLogin(e2e.http, e2e.sms);
    await e2e.prisma.wallet.create({ data: { user_id: u.userId, balance: 400 } });
    // Settled ledger rows (a deposit and a withdrawal) as they would appear post-settlement.
    await e2e.prisma.transaction.createMany({
      data: [
        { user_id: u.userId, type: 'DEPOSIT', status: 'COMPLETED', amount: 500, balance_after: 500, description: 'deposit' },
        { user_id: u.userId, type: 'WITHDRAWAL', status: 'COMPLETED', amount: 100, balance_after: 400, description: 'payout' },
      ],
    });

    const wallet = await request(e2e.http).get(`${API}/wallet`).set(bearer(u.accessToken)).expect(200);
    expect(Number(wallet.body.balance)).toBe(400);

    const txns = await request(e2e.http)
      .get(`${API}/wallet/transactions?page=1&limit=20`)
      .set(bearer(u.accessToken))
      .expect(200);
    expect(txns.body.total).toBe(2);
    const types = txns.body.transactions.map((t: any) => t.type).sort();
    expect(types).toEqual(['DEPOSIT', 'WITHDRAWAL']);
  });
});
