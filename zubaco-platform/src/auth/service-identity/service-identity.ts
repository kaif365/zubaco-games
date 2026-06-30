import { createHmac, timingSafeEqual, createHash } from 'crypto';

/**
 * Enterprise per-service identity registry (AUTH-003).
 *
 * Replaces the single shared INTERNAL_API_KEY with per-service signing keys,
 * supporting overlapping current/previous secrets for zero-downtime rotation.
 *
 * Secrets are provisioned via the SERVICE_IDENTITY_KEYS env var (JSON):
 *   {"arrows":{"current":"<32+hex>","previous":"<optional>"}, ...}
 * Compromise of one game backend exposes only that service's key, never others.
 */
export interface ServiceKeyPair {
  current: string;
  previous?: string;
}

export type ServiceRegistry = Record<string, ServiceKeyPair>;

export const MAX_CLOCK_SKEW_MS = 60_000;

export function loadServiceRegistry(raw: string | undefined): ServiceRegistry {
  if (!raw) return {};
  const parsed = JSON.parse(raw) as ServiceRegistry;
  for (const [id, pair] of Object.entries(parsed)) {
    if (!pair.current || pair.current.length < 32) {
      throw new Error(`Service identity ${id} requires a current key of >=32 chars`);
    }
  }
  return parsed;
}

export function canonicalString(
  serviceId: string,
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  bodyHash: string,
): string {
  return [serviceId, method.toUpperCase(), path, timestamp, nonce, bodyHash].join('\n');
}

export function hashBody(body: unknown): string {
  return createHash('sha256').update(body ? JSON.stringify(body) : '').digest('hex');
}

function sign(secret: string, canonical: string): string {
  return createHmac('sha256', secret).update(canonical).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Verify a signature against current and previous (rotation) secrets. */
export function verifySignature(
  pair: ServiceKeyPair,
  canonical: string,
  signature: string,
): boolean {
  if (safeEqual(sign(pair.current, canonical), signature)) return true;
  if (pair.previous && safeEqual(sign(pair.previous, canonical), signature)) return true;
  return false;
}
