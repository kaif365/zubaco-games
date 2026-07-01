/**
 * Phase T4-B — Section C: GAME SESSION + Section D: VERIFICATION (real HTTP).
 *
 * Drives the authoritative game lifecycle through REAL HTTP: start a session,
 * submit a result and observe the SERVER-derived (authoritative) score plus the
 * verification verdict persisted onto the session. Also covers replay/duplicate
 * rejection, ownership isolation, and DTO-level rejection of invalid payloads.
 */
import request from 'supertest';
import { bootE2EApp, E2EApp } from './e2e-app';
import { API, bearer, registerAndLogin, LoggedInUser } from './helpers/http-auth';

const GAME = 'SLIDING_PUZZLE';

async function startSession(e2e: E2EApp, u: LoggedInUser): Promise<string> {
  const res = await request(e2e.http)
    .post(`${API}/game-session/start`)
    .set(bearer(u.accessToken))
    .send({ game_type: GAME, config: {} });
  expect(res.status).toBe(201);
  expect(res.body.gameSessionId).toEqual(expect.any(String));
  return res.body.gameSessionId;
}

describe('E2E · Section C/D — Game Session & Verification', () => {
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

  it('starts an ACTIVE session persisted in Postgres', async () => {
    const sessionId = await startSession(e2e, user);
    const row = await e2e.prisma.gameSession.findUnique({ where: { id: sessionId } });
    expect(row).toBeTruthy();
    expect(row!.outcome).toBeNull();
  });

  it('submits a result and returns the AUTHORITATIVE (server-derived) score', async () => {
    const sessionId = await startSession(e2e, user);

    const res = await request(e2e.http)
      .post(`${API}/game-session/${sessionId}/submit`)
      .set(bearer(user.accessToken))
      .send({ score: 100, duration_ms: 2000, metadata: { rounds: [] } });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, score: expect.any(Number) });

    // Section D — the verification verdict is persisted onto the session.
    const row = await e2e.prisma.gameSession.findUnique({ where: { id: sessionId } });
    expect(row!.outcome).toBe('COMPLETED');
    expect((row!.metadata as any)?._verification).toBeTruthy();
    expect(row!.score).toBe(res.body.score); // persisted == authoritative
  });

  it('rejects a duplicate submission of a completed session (replay → 404)', async () => {
    const sessionId = await startSession(e2e, user);
    await request(e2e.http)
      .post(`${API}/game-session/${sessionId}/submit`)
      .set(bearer(user.accessToken))
      .send({ score: 100, duration_ms: 2000, metadata: { rounds: [] } })
      .expect(201);

    const replay = await request(e2e.http)
      .post(`${API}/game-session/${sessionId}/submit`)
      .set(bearer(user.accessToken))
      .send({ score: 100, duration_ms: 2000, metadata: { rounds: [] } });
    expect(replay.status).toBe(404);
  });

  it('rejects another user\'s session on submit (ownership → 404)', async () => {
    const sessionId = await startSession(e2e, user);
    const other = await registerAndLogin(e2e.http, e2e.sms);

    const res = await request(e2e.http)
      .post(`${API}/game-session/${sessionId}/submit`)
      .set(bearer(other.accessToken))
      .send({ score: 100, duration_ms: 2000, metadata: { rounds: [] } });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid (negative) score at the DTO boundary (400)', async () => {
    const sessionId = await startSession(e2e, user);
    const res = await request(e2e.http)
      .post(`${API}/game-session/${sessionId}/submit`)
      .set(bearer(user.accessToken))
      .send({ score: -5, duration_ms: 2000 });
    expect(res.status).toBe(400);
  });

  it('rejects an implausibly short duration at the DTO boundary (400)', async () => {
    const sessionId = await startSession(e2e, user);
    const res = await request(e2e.http)
      .post(`${API}/game-session/${sessionId}/submit`)
      .set(bearer(user.accessToken))
      .send({ score: 100, duration_ms: 500 });
    expect(res.status).toBe(400);
  });

  it('returns the session state (GET /game-session/:id/state)', async () => {
    const sessionId = await startSession(e2e, user);
    const res = await request(e2e.http)
      .get(`${API}/game-session/${sessionId}/state`)
      .set(bearer(user.accessToken));
    expect(res.status).toBe(200);
  });

  it('requires authentication to start a session (401)', async () => {
    const res = await request(e2e.http).post(`${API}/game-session/start`).send({ game_type: GAME });
    expect(res.status).toBe(401);
  });
});
