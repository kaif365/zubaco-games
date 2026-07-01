/**
 * Phase T4-B — Section F: WALLET (real HTTP).
 *
 * Covers the JWT-protected wallet surface end-to-end: balance read, transaction
 * history, and DTO-level guards on withdrawal/deposit amounts. The money-moving
 * paths (Razorpay deposit order + settlement, OTP-gated withdrawal payout) sit
 * behind EXTERNAL providers (payment gateway, SMS) and a live Razorpay account;
 * those authoritative ledger behaviours are proven at the service+DB level in
 * the T4-A integration suite. Here we verify everything reachable over pure HTTP
 * without a live gateway, and document the external boundary honestly.
 */
import request from 'supertest';
import { bootE2EApp, E2EApp } from './e2e-app';
import { API, bearer, registerAndLogin, LoggedInUser } from './helpers/http-auth';

describe('E2E · Section F — Wallet', () => {
  let e2e: E2EApp;
  let user: LoggedInUser;

  beforeAll(async () => {
    e2e = await bootE2EApp();
  });

  afterAll(async () => {
    await e2e.close();
  });

  beforeEach(async () => {
    await e2e.reset();
    user = await registerAndLogin(e2e.http, e2e.sms);
  });

  it('reflects a seeded balance on GET /wallet', async () => {
    // Seed a wallet row directly (data fixture) so the read is deterministic.
    await e2e.prisma.wallet.create({ data: { user_id: user.userId, balance: 750, bonus_balance: 50 } });

    const res = await request(e2e.http).get(`${API}/wallet`).set(bearer(user.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(user.userId);
    expect(Number(res.body.balance)).toBe(750);
    expect(Number(res.body.bonus_balance)).toBe(50);
  });

  it('lists transaction history including seeded ledger rows (GET /wallet/transactions)', async () => {
    await e2e.prisma.wallet.create({ data: { user_id: user.userId, balance: 100 } });
    await e2e.prisma.transaction.create({
      data: {
        user_id: user.userId,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        amount: 100,
        balance_after: 100,
        description: 'seed',
      },
    });

    const res = await request(e2e.http)
      .get(`${API}/wallet/transactions?page=1&limit=20`)
      .set(bearer(user.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].type).toBe('DEPOSIT');
  });

  it('rejects a below-minimum withdrawal amount at the DTO boundary (400)', async () => {
    const res = await request(e2e.http)
      .post(`${API}/wallet/withdraw`)
      .set(bearer(user.accessToken))
      .send({ amount: 50 }); // min is ₹100
    expect(res.status).toBe(400);
  });

  it('rejects a withdrawal with insufficient funds (>= 400)', async () => {
    await e2e.prisma.wallet.create({ data: { user_id: user.userId, balance: 0 } });
    const res = await request(e2e.http)
      .post(`${API}/wallet/withdraw`)
      .set(bearer(user.accessToken))
      .send({ amount: 500 });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects a below-minimum deposit amount at the DTO boundary (400)', async () => {
    const res = await request(e2e.http)
      .post(`${API}/wallet/deposit/create-order`)
      .set(bearer(user.accessToken))
      .send({ amount: 5 }); // min is ₹10
    expect(res.status).toBe(400);
  });

  it('requires authentication for wallet reads (401)', async () => {
    const res = await request(e2e.http).get(`${API}/wallet`);
    expect(res.status).toBe(401);
  });
});
