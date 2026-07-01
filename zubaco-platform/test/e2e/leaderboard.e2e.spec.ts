/**
 * Phase T4-B — Section H: LEADERBOARD (real HTTP).
 *
 * Reads the JWT-protected leaderboard surface against REAL data. Rankings are
 * seeded through `GameProgress` (the authoritative DB fallback the leaderboard
 * reads from) so the ordering is deterministic, then asserted over pure HTTP.
 */
import request from 'supertest';
import { bootE2EApp, E2EApp } from './e2e-app';
import { API, bearer, registerAndLogin, LoggedInUser } from './helpers/http-auth';

const GAME = 'SLIDING_PUZZLE';

describe('E2E · Section H — Leaderboard', () => {
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

  it('returns the global game leaderboard (GET /leaderboard/game/:gameType)', async () => {
    await e2e.prisma.gameProgress.create({
      data: { user_id: user.userId, game_type: GAME as any, best_score: 1800, highest_level: 9 },
    });

    const res = await request(e2e.http)
      .get(`${API}/leaderboard/game/${GAME}`)
      .set(bearer(user.accessToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // The seeded user must appear as the sole (rank 1) entry with their real best score.
    const mine = res.body.find((row: any) => row.user?.id === user.userId);
    expect(mine).toBeDefined();
    expect(mine.rank).toBe(1);
    expect(mine.score).toBe(1800);
  });

  it('returns the caller\'s own rank (GET /leaderboard/game/:gameType/me)', async () => {
    await e2e.prisma.gameProgress.create({
      data: { user_id: user.userId, game_type: GAME as any, best_score: 1200, highest_level: 6 },
    });

    const res = await request(e2e.http)
      .get(`${API}/leaderboard/game/${GAME}/me`)
      .set(bearer(user.accessToken));
    expect(res.status).toBe(200);
    // Rank is served from the Redis sorted set, which is only populated by real
    // gameplay score submissions — none here — so the caller is honestly unranked.
    expect(res.body).toHaveProperty('rank', null);
    expect(res.body).toHaveProperty('score', null);
  });

  it('returns the endless leaderboard (GET /leaderboard/game/:gameType/endless)', async () => {
    const res = await request(e2e.http)
      .get(`${API}/leaderboard/game/${GAME}/endless`)
      .set(bearer(user.accessToken));
    expect(res.status).toBe(200);
  });

  it('requires authentication for leaderboard routes (401)', async () => {
    const res = await request(e2e.http).get(`${API}/leaderboard/game/${GAME}`);
    expect(res.status).toBe(401);
  });
});
