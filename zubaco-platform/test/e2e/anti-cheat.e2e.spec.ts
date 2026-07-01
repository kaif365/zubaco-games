/**
 * Phase T4-B — Section E: ANTI-CHEAT (real HTTP, signed).
 *
 * The anti-cheat surface is a service-to-service API protected by
 * `ServiceIdentityGuard` (HMAC-signed), NOT JWT. These tests compute genuine
 * signatures and drive the REAL enforcement paths over HTTP: ban, reverse-ban,
 * the flag queue, and per-user flag lookup — with the authoritative ban column
 * verified against the REAL database. Unsigned requests are rejected.
 *
 * HONEST SCOPE: automatic cheat DETECTION happens inside the authoritative game
 * completion pipeline (server re-derives the score, so a client cannot inflate
 * it over HTTP) and is proven end-to-end at the service+DB level in the T4-A
 * anti-cheat integration suite. Leaderboard-score removal on enforcement is
 * exercised via the admin control plane in the scenario suite (journey J3).
 */
import request from 'supertest';
import { bootE2EApp, E2EApp } from './e2e-app';
import { API } from './helpers/http-auth';
import { signServiceRequest } from './helpers/service-identity';

describe('E2E · Section E — Anti-Cheat', () => {
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

  async function seedUser(): Promise<string> {
    const suffix = Math.random().toString(36).slice(2, 10);
    const u = await e2e.prisma.user.create({
      data: { username: `c_${suffix}`, phone: `+9196${suffix.slice(0, 8)}` },
    });
    return u.id;
  }

  function signedPost(path: string, body?: Record<string, unknown>) {
    const payload = body ?? {};
    return request(e2e.http)
      .post(path)
      .set(signServiceRequest('POST', path, payload))
      .send(payload);
  }

  function signedGet(path: string) {
    return request(e2e.http).get(path).set(signServiceRequest('GET', path));
  }

  it('rejects an UNSIGNED anti-cheat request (401)', async () => {
    const res = await request(e2e.http).get(`${API}/anti-cheat/flags`);
    expect(res.status).toBe(401);
  });

  it('bans a user via the enforcement engine (real DB side-effect)', async () => {
    const target = await seedUser();
    const res = await signedPost(`${API}/anti-cheat/users/${target}/ban`, { reason: 'aimbot detected' });
    expect(res.status).toBe(201);

    const user = await e2e.prisma.user.findUnique({ where: { id: target } });
    expect(user!.is_banned).toBe(true);
  });

  it('reverses a ban (unban) authoritatively', async () => {
    const target = await seedUser();
    await signedPost(`${API}/anti-cheat/users/${target}/ban`, { reason: 'x' }).expect(201);

    const res = await signedPost(`${API}/anti-cheat/users/${target}/unban`);
    expect(res.status).toBe(201);

    const user = await e2e.prisma.user.findUnique({ where: { id: target } });
    expect(user!.is_banned).toBe(false);
  });

  it('returns the flag queue (GET /anti-cheat/flags)', async () => {
    const res = await signedGet(`${API}/anti-cheat/flags`);
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('returns per-user flags (GET /anti-cheat/users/:userId/flags)', async () => {
    const target = await seedUser();
    const res = await signedGet(`${API}/anti-cheat/users/${target}/flags`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.flags)).toBe(true);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.total).toBe(0);
  });
});
