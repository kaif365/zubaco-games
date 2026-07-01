/**
 * ServiceIdentity request signer for the E2E suite.
 *
 * The `/admin/control-plane` and `/anti-cheat` endpoints are protected by
 * `ServiceIdentityGuard` (HMAC-signed service-to-service auth), NOT by JWT. To
 * exercise them through REAL HTTP we compute a genuine signature using the
 * exact same canonicalisation the guard verifies with:
 *
 *   canonical = serviceId\nMETHOD\npath\ntimestamp\nnonce\nsha256(body)
 *   signature = HMAC-SHA256(secret, canonical)  (hex)
 *
 * `path` MUST be the full request path including the `/api/v1` global prefix and
 * any query string, because the guard signs `req.originalUrl`. The signing key
 * matches `SERVICE_IDENTITY_KEYS` set in test/e2e/setup.env.ts.
 */
import { createHmac, createHash, randomUUID } from 'crypto';

export const SERVICE_ID = 'test-suite';
export const SERVICE_KEY = 'e2e0000000000000000000000000000000000000000000000000000000000key';

function hashBody(body: unknown): string {
  return createHash('sha256')
    .update(body ? JSON.stringify(body) : '')
    .digest('hex');
}

export interface ServiceHeaders {
  'x-service-id': string;
  'x-timestamp': string;
  'x-nonce': string;
  'x-signature': string;
}

/**
 * Produce the four signed headers for a service-to-service request.
 *
 * @param method HTTP method (e.g. 'POST').
 * @param path   Full path INCLUDING `/api/v1` and any query string, exactly as
 *               passed to supertest (e.g. '/api/v1/admin/control-plane/audit?limit=10').
 * @param body   The JSON body that will be sent (or undefined for GET).
 */
export function signServiceRequest(method: string, path: string, body?: unknown): ServiceHeaders {
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const canonical = [SERVICE_ID, method.toUpperCase(), path, timestamp, nonce, hashBody(body)].join('\n');
  const signature = createHmac('sha256', SERVICE_KEY).update(canonical).digest('hex');
  return {
    'x-service-id': SERVICE_ID,
    'x-timestamp': timestamp,
    'x-nonce': nonce,
    'x-signature': signature,
  };
}
