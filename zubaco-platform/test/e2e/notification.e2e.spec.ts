/**
 * Phase T4-B — Section I: NOTIFICATIONS (real HTTP).
 *
 * Covers the JWT-protected notification surface end-to-end: fetching the feed,
 * marking one read, and marking all read — with read-state transitions verified
 * against the REAL database.
 */
import request from 'supertest';
import { bootE2EApp, E2EApp } from './e2e-app';
import { API, bearer, registerAndLogin, LoggedInUser } from './helpers/http-auth';

describe('E2E · Section I — Notifications', () => {
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

  const seed = (title: string, body = 'x') =>
    e2e.prisma.notification.create({ data: { user_id: user.userId, type: 'SYSTEM', title, body } });

  it('fetches the notification feed with unread count', async () => {
    await seed('A');
    await seed('B');

    const res = await request(e2e.http).get(`${API}/notifications`).set(bearer(user.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.unread_count).toBe(2);
  });

  it('marks a single notification read (POST /notifications/:id/read)', async () => {
    const n = await seed('A');
    await seed('B');

    const res = await request(e2e.http)
      .post(`${API}/notifications/${n.id}/read`)
      .set(bearer(user.accessToken));
    expect(res.status).toBe(201);

    const reloaded = await e2e.prisma.notification.findUnique({ where: { id: n.id } });
    expect(reloaded!.read).toBe(true);

    const feed = await request(e2e.http).get(`${API}/notifications`).set(bearer(user.accessToken));
    expect(feed.body.unread_count).toBe(1);
  });

  it('marks all notifications read (POST /notifications/read-all)', async () => {
    await seed('A');
    await seed('B');
    await seed('C');

    const res = await request(e2e.http).post(`${API}/notifications/read-all`).set(bearer(user.accessToken));
    expect(res.status).toBe(201);

    const feed = await request(e2e.http).get(`${API}/notifications`).set(bearer(user.accessToken));
    expect(feed.body.unread_count).toBe(0);
  });

  it('requires authentication (401)', async () => {
    const res = await request(e2e.http).get(`${API}/notifications`);
    expect(res.status).toBe(401);
  });
});
