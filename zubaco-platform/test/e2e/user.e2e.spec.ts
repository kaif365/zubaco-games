/**
 * Phase T4-B — Section B: USER (real HTTP).
 *
 * Exercises the JWT-protected `/users`, `/wallet` and `/social` surfaces the way
 * the app itself does: authenticate over HTTP, then read/update the profile,
 * wallet, history, stats, achievements, notifications and referral code. All
 * assertions are made against REAL responses / the REAL database.
 */
import request from 'supertest';
import { bootE2EApp, E2EApp } from './e2e-app';
import { API, bearer, registerAndLogin, LoggedInUser } from './helpers/http-auth';

describe('E2E · Section B — User', () => {
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

  it('returns the authenticated profile (GET /users/me)', async () => {
    const res = await request(e2e.http).get(`${API}/users/me`).set(bearer(user.accessToken));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.userId, phone: user.phone });
  });

  it('updates the profile (PATCH /users/me) and persists it', async () => {
    const res = await request(e2e.http)
      .patch(`${API}/users/me`)
      .set(bearer(user.accessToken))
      .send({ display_name: 'Neo Anderson' });
    expect(res.status).toBe(200);

    const row = await e2e.prisma.user.findUnique({ where: { id: user.userId } });
    expect(row!.display_name).toBe('Neo Anderson');
  });

  it('rejects an over-length username via DTO validation (400)', async () => {
    const res = await request(e2e.http)
      .patch(`${API}/users/me`)
      .set(bearer(user.accessToken))
      .send({ username: 'x'.repeat(50) });
    expect(res.status).toBe(400);
  });

  it('returns paginated game history (GET /users/me/history)', async () => {
    const res = await request(e2e.http)
      .get(`${API}/users/me/history?page=1&limit=10`)
      .set(bearer(user.accessToken));
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('returns aggregate stats (GET /users/me/stats)', async () => {
    const res = await request(e2e.http).get(`${API}/users/me/stats`).set(bearer(user.accessToken));
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('returns tournament history (GET /users/me/tournaments)', async () => {
    const res = await request(e2e.http).get(`${API}/users/me/tournaments`).set(bearer(user.accessToken));
    expect(res.status).toBe(200);
  });

  it('returns achievements (GET /users/me/achievements)', async () => {
    const res = await request(e2e.http).get(`${API}/users/me/achievements`).set(bearer(user.accessToken));
    expect(res.status).toBe(200);
  });

  it('auto-provisions and returns the wallet (GET /wallet)', async () => {
    const res = await request(e2e.http).get(`${API}/wallet`).set(bearer(user.accessToken));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ user_id: user.userId });
    expect(Number(res.body.balance)).toBe(0);
  });

  it('returns the notification feed (GET /notifications)', async () => {
    // Seed a notification directly (data fixture, not business logic).
    await e2e.prisma.notification.create({
      data: { user_id: user.userId, type: 'SYSTEM', title: 'Hi', body: 'Welcome aboard' },
    });

    const res = await request(e2e.http).get(`${API}/notifications`).set(bearer(user.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.unread_count).toBe(1);
  });

  it('returns the referral code (GET /social/referral/code)', async () => {
    const res = await request(e2e.http).get(`${API}/social/referral/code`).set(bearer(user.accessToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('code');
  });
});
