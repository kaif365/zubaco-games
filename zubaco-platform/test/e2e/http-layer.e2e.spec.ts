/**
 * Phase T4-B — Section K: HTTP LAYER (real HTTP).
 *
 * Focuses on the transport contract itself rather than business logic: global
 * ValidationPipe behaviour (whitelist + forbidNonWhitelisted + type coercion),
 * default Nest exception-filter shape, HTTP status-code correctness, helmet
 * security headers, JSON content negotiation, public vs protected routing, and
 * unknown-route 404s.
 */
import request from 'supertest';
import { bootE2EApp, E2EApp } from './e2e-app';
import { API, bearer, registerAndLogin } from './helpers/http-auth';

describe('E2E · Section K — HTTP Layer', () => {
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

  it('serves public routes without authentication (health, version, legal)', async () => {
    const health = await request(e2e.http).get(`${API}/health`);
    expect(health.status).toBe(200);

    const version = await request(e2e.http).get(`${API}/app/version`);
    expect(version.status).toBe(200);

    const legal = await request(e2e.http).get(`${API}/legal/terms`);
    expect(legal.status).toBe(200);
  });

  it('returns 404 for an unknown route with the default error shape', async () => {
    const res = await request(e2e.http).get(`${API}/this-route-does-not-exist`);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ statusCode: 404, message: expect.any(String) });
  });

  it('rejects a missing required field via ValidationPipe (400 + structured body)', async () => {
    const res = await request(e2e.http).post(`${API}/auth/otp/send`).send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      message: expect.any(Array),
      error: 'Bad Request',
    });
  });

  it('rejects unknown/extra properties (forbidNonWhitelisted → 400)', async () => {
    const res = await request(e2e.http)
      .post(`${API}/auth/otp/send`)
      .send({ phone: '+919812345678', injected_admin: true });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.message)).toMatch(/injected_admin/);
  });

  it('applies helmet security headers on responses', async () => {
    const res = await request(e2e.http).get(`${API}/health`);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    // helmet strips the framework fingerprint.
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('negotiates JSON content-type', async () => {
    const res = await request(e2e.http).get(`${API}/health`);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('returns 401 with a structured body on a protected route without a token', async () => {
    const res = await request(e2e.http).get(`${API}/users/me`);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ statusCode: 401 });
  });

  it('uses the correct success status codes (@HttpCode 200 vs default 201)', async () => {
    // otp/send is explicitly @HttpCode(200).
    const send = await request(e2e.http).post(`${API}/auth/otp/send`).send({ phone: '+919800000011' });
    expect(send.status).toBe(200);

    // A default POST (create) returns 201.
    const u = await registerAndLogin(e2e.http, e2e.sms);
    const start = await request(e2e.http)
      .post(`${API}/game-session/start`)
      .set(bearer(u.accessToken))
      .send({ game_type: 'SLIDING_PUZZLE', config: {} });
    expect(start.status).toBe(201);
  });

  it('does not leak sensitive fields in the profile response (serialization)', async () => {
    const u = await registerAndLogin(e2e.http, e2e.sms);
    const res = await request(e2e.http).get(`${API}/users/me`).set(bearer(u.accessToken));
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('otp_hash');
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('refresh_token');
  });
});
