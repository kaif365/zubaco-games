/**
 * Phase T4-B — Section A: AUTHENTICATION (real HTTP).
 *
 * Boots the REAL application and drives the authentication surface exactly like
 * a production client: request an OTP, verify it (auto-register), then use the
 * minted JWT against protected routes. Covers login, protected-route access,
 * unauthorized/invalid/expired tokens, refresh-token rotation, logout
 * revocation, OTP rate-limiting and ban-based 403 enforcement.
 *
 * Nothing is mocked except the SMS provider (external), whose captured message
 * yields the OTP so the flow is genuinely end-to-end.
 */
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { bootE2EApp, E2EApp } from './e2e-app';
import { API, bearer, registerAndLogin, uniquePhone } from './helpers/http-auth';

describe('E2E · Section A — Authentication', () => {
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

  it('registers + logs in via the real OTP flow and returns a JWT pair', async () => {
    const phone = uniquePhone();

    const send = await request(e2e.http).post(`${API}/auth/otp/send`).send({ phone });
    expect(send.status).toBe(200);
    expect(send.body).toEqual({ message: 'OTP sent successfully' });

    const otp = e2e.sms.lastOtp(phone);
    expect(otp).toMatch(/^\d{6}$/);

    const verify = await request(e2e.http).post(`${API}/auth/otp/verify`).send({ phone, otp });
    expect(verify.status).toBe(200);
    expect(verify.body).toMatchObject({
      user: { id: expect.any(String), phone },
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it('grants access to a protected route with a valid access token', async () => {
    const u = await registerAndLogin(e2e.http, e2e.sms);

    const me = await request(e2e.http).get(`${API}/users/me`).set(bearer(u.accessToken));
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ id: u.userId, phone: u.phone });
  });

  it('rejects a protected route with NO token (401 Unauthorized)', async () => {
    const res = await request(e2e.http).get(`${API}/users/me`);
    expect(res.status).toBe(401);
  });

  it('rejects a structurally-invalid bearer token (401 Unauthorized)', async () => {
    const res = await request(e2e.http)
      .get(`${API}/users/me`)
      .set({ Authorization: 'Bearer not-a-real-jwt' });
    expect(res.status).toBe(401);
  });

  it('rejects an EXPIRED but correctly-signed access token (401 Unauthorized)', async () => {
    const u = await registerAndLogin(e2e.http, e2e.sms);
    const expired = jwt.sign({ sub: u.userId, type: 'access' }, process.env.JWT_ACCESS_SECRET as string, {
      expiresIn: '-10s',
    });

    const res = await request(e2e.http).get(`${API}/users/me`).set(bearer(expired));
    expect(res.status).toBe(401);
  });

  it('rotates tokens on refresh and rejects an unknown refresh token', async () => {
    const u = await registerAndLogin(e2e.http, e2e.sms);

    const refreshed = await request(e2e.http)
      .post(`${API}/auth/refresh`)
      .send({ refresh_token: u.refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.refreshToken).toEqual(expect.any(String));
    // Rotation: a brand-new refresh token is issued.
    expect(refreshed.body.refreshToken).not.toBe(u.refreshToken);

    const bad = await request(e2e.http)
      .post(`${API}/auth/refresh`)
      .send({ refresh_token: 'de305d54-75b4-431b-adb2-eb6b9e546014' });
    expect(bad.status).toBe(401);
  });

  it('revokes the refresh token on logout (rotation cannot continue)', async () => {
    const u = await registerAndLogin(e2e.http, e2e.sms);

    const logout = await request(e2e.http)
      .post(`${API}/auth/logout`)
      .set(bearer(u.accessToken))
      .send({ refresh_token: u.refreshToken });
    expect(logout.status).toBe(200);

    const afterLogout = await request(e2e.http)
      .post(`${API}/auth/refresh`)
      .send({ refresh_token: u.refreshToken });
    expect(afterLogout.status).toBe(401);
  });

  it('revokes ALL sessions on logout-all', async () => {
    const u = await registerAndLogin(e2e.http, e2e.sms);

    const res = await request(e2e.http).post(`${API}/auth/logout-all`).set(bearer(u.accessToken));
    expect(res.status).toBe(200);

    const afterLogout = await request(e2e.http)
      .post(`${API}/auth/refresh`)
      .send({ refresh_token: u.refreshToken });
    expect(afterLogout.status).toBe(401);
  });

  it('rejects a wrong OTP (401 Unauthorized)', async () => {
    const phone = uniquePhone();
    await request(e2e.http).post(`${API}/auth/otp/send`).send({ phone });

    const res = await request(e2e.http).post(`${API}/auth/otp/verify`).send({ phone, otp: '000000' });
    expect(res.status).toBe(401);
  });

  it('enforces the OTP send rate-limit (max 5 per phone per hour)', async () => {
    const phone = uniquePhone();
    for (let i = 0; i < 5; i++) {
      const ok = await request(e2e.http).post(`${API}/auth/otp/send`).send({ phone });
      expect(ok.status).toBe(200);
    }
    const sixth = await request(e2e.http).post(`${API}/auth/otp/send`).send({ phone });
    expect(sixth.status).toBe(400);
  });

  it('returns 403 Forbidden for a banned user holding a valid token', async () => {
    const u = await registerAndLogin(e2e.http, e2e.sms);
    await e2e.prisma.user.update({ where: { id: u.userId }, data: { is_banned: true } });

    const res = await request(e2e.http).get(`${API}/users/me`).set(bearer(u.accessToken));
    expect(res.status).toBe(403);
  });
});
