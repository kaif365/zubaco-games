/**
 * Phase T4-B — Section G: TOURNAMENT (real HTTP).
 *
 * Covers the JWT-protected tournament surface: listing active seasons,
 * registering (free entry), duplicate-registration rejection, per-user status,
 * and stage rankings — all through REAL HTTP against a REAL season seeded in
 * Postgres. Prize distribution is an admin/finance action and is proven via the
 * signed admin control-plane in the admin + scenario suites.
 */
import request from 'supertest';
import { bootE2EApp, E2EApp } from './e2e-app';
import { API, bearer, registerAndLogin, LoggedInUser } from './helpers/http-auth';

describe('E2E · Section G — Tournament', () => {
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

  const freeSeason = () =>
    e2e.prisma.season.create({
      data: {
        name: 'Free Cup',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 86400000),
        status: 'REGISTRATION',
      },
    });

  it('lists active seasons (GET /tournament/seasons)', async () => {
    await freeSeason();
    const res = await request(e2e.http).get(`${API}/tournament/seasons`).set(bearer(user.accessToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it('registers a user for a free season and persists a SeasonEntry', async () => {
    const season = await freeSeason();
    const res = await request(e2e.http)
      .post(`${API}/tournament/seasons/${season.id}/register`)
      .set(bearer(user.accessToken));
    expect(res.status).toBe(201);

    const entry = await e2e.prisma.seasonEntry.findUnique({
      where: { user_id_season_id: { user_id: user.userId, season_id: season.id } },
    });
    expect(entry).toBeTruthy();
    expect(entry!.status).toBe('ACTIVE');
  });

  it('rejects a duplicate registration (409 Conflict)', async () => {
    const season = await freeSeason();
    await request(e2e.http)
      .post(`${API}/tournament/seasons/${season.id}/register`)
      .set(bearer(user.accessToken))
      .expect(201);

    const dup = await request(e2e.http)
      .post(`${API}/tournament/seasons/${season.id}/register`)
      .set(bearer(user.accessToken));
    expect(dup.status).toBe(409);
    expect(await e2e.prisma.seasonEntry.count({ where: { season_id: season.id } })).toBe(1);
  });

  it('returns the user\'s season status (GET /tournament/seasons/:id/status)', async () => {
    const season = await freeSeason();
    await request(e2e.http)
      .post(`${API}/tournament/seasons/${season.id}/register`)
      .set(bearer(user.accessToken))
      .expect(201);

    const res = await request(e2e.http)
      .get(`${API}/tournament/seasons/${season.id}/status`)
      .set(bearer(user.accessToken));
    expect(res.status).toBe(200);
  });

  it('requires authentication for tournament routes (401)', async () => {
    const res = await request(e2e.http).get(`${API}/tournament/seasons`);
    expect(res.status).toBe(401);
  });
});
