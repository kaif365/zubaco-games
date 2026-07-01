/**
 * HTTP auth helpers for the E2E suite. Everything here drives the REAL auth
 * surface over HTTP — no service is instantiated directly. A test "logs in" the
 * same way a mobile client does: request an OTP, read the code the app tried to
 * SMS (captured by {@link SmsCaptureStub}), then verify it to obtain a real JWT
 * pair minted by the production `TokenService`.
 */
import type { Server } from 'http';
import request from 'supertest';
import type { SmsCaptureStub } from '../e2e-app';

export const API = '/api/v1';

let phoneSeq = 0;

/** A unique, deterministic Indian-format phone number per call. */
export function uniquePhone(): string {
  phoneSeq += 1;
  const tail = String(Date.now() % 100000).padStart(5, '0') + String(phoneSeq).padStart(3, '0');
  return `+9198${tail.slice(0, 8)}`;
}

export interface LoggedInUser {
  userId: string;
  phone: string;
  accessToken: string;
  refreshToken: string;
  user: Record<string, any>;
}

/**
 * Full real HTTP registration + login: POST /auth/otp/send → recover the OTP
 * from the SMS capture → POST /auth/otp/verify. On first verification the app
 * auto-registers the user, so this doubles as "register".
 */
export async function registerAndLogin(
  http: Server,
  sms: SmsCaptureStub,
  phone: string = uniquePhone(),
): Promise<LoggedInUser> {
  const sendRes = await request(http).post(`${API}/auth/otp/send`).send({ phone });
  if (sendRes.status !== 200) {
    throw new Error(`otp/send failed (${sendRes.status}): ${JSON.stringify(sendRes.body)}`);
  }

  const otp = sms.lastOtp(phone);
  if (!otp) throw new Error(`No OTP captured for ${phone}`);

  const verifyRes = await request(http).post(`${API}/auth/otp/verify`).send({ phone, otp });
  if (verifyRes.status !== 200) {
    throw new Error(`otp/verify failed (${verifyRes.status}): ${JSON.stringify(verifyRes.body)}`);
  }

  const body = verifyRes.body;
  return {
    userId: body.user.id,
    phone,
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    user: body.user,
  };
}

/** Convenience: the Authorization header for a bearer access token. */
export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
