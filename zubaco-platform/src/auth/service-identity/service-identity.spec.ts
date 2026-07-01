import { createHmac } from 'crypto';
import {
  MAX_CLOCK_SKEW_MS,
  canonicalString,
  hashBody,
  loadServiceRegistry,
  verifySignature,
  ServiceKeyPair,
} from './service-identity';

/**
 * Unit tests for the per-service identity primitives (AUTH-003).
 *
 * Pure crypto/business logic: HMAC signing, canonicalisation, body hashing,
 * key-rotation acceptance, and constant-time verification. Security-critical —
 * these guarantees are what stop a compromised game backend from forging
 * requests as another service, so every branch is asserted directly.
 */
describe('service-identity primitives', () => {
  const sign = (secret: string, canonical: string): string =>
    createHmac('sha256', secret).update(canonical).digest('hex');

  describe('loadServiceRegistry', () => {
    it('returns an empty registry when the env var is undefined', () => {
      expect(loadServiceRegistry(undefined)).toEqual({});
    });

    it('parses a valid multi-service registry with rotation keys', () => {
      const raw = JSON.stringify({
        arrows: { current: 'a'.repeat(32), previous: 'b'.repeat(40) },
        puzzle: { current: 'c'.repeat(64) },
      });
      const reg = loadServiceRegistry(raw);
      expect(Object.keys(reg)).toEqual(['arrows', 'puzzle']);
      expect(reg.arrows.previous).toBe('b'.repeat(40));
      expect(reg.puzzle.previous).toBeUndefined();
    });

    it('rejects a service whose current key is shorter than 32 chars', () => {
      const raw = JSON.stringify({ weak: { current: 'short' } });
      expect(() => loadServiceRegistry(raw)).toThrow(/weak requires a current key of >=32/);
    });

    it('rejects a service missing a current key entirely', () => {
      const raw = JSON.stringify({ broken: { previous: 'x'.repeat(40) } });
      expect(() => loadServiceRegistry(raw)).toThrow(/broken requires a current key/);
    });
  });

  describe('canonicalString', () => {
    it('joins the six fields with newlines and upper-cases the method', () => {
      const c = canonicalString('arrows', 'post', '/api/v1/x', '1700', 'nonce-1', 'deadbeef');
      expect(c).toBe('arrows\nPOST\n/api/v1/x\n1700\nnonce-1\ndeadbeef');
    });

    it('is order-sensitive — swapping path and nonce changes the string', () => {
      const a = canonicalString('s', 'GET', '/a', '1', 'n', 'h');
      const b = canonicalString('s', 'GET', '/n', '1', 'a', 'h');
      expect(a).not.toBe(b);
    });
  });

  describe('hashBody', () => {
    it('hashes an empty body as the sha256 of the empty string', () => {
      // sha256('') is a well-known constant.
      expect(hashBody(undefined)).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      );
      expect(hashBody(null)).toBe(hashBody(undefined));
    });

    it('is deterministic for identical payloads', () => {
      const body = { amount: 100, currency: 'INR' };
      expect(hashBody(body)).toBe(hashBody({ amount: 100, currency: 'INR' }));
    });

    it('changes when the payload changes', () => {
      expect(hashBody({ amount: 100 })).not.toBe(hashBody({ amount: 101 }));
    });
  });

  describe('verifySignature', () => {
    const canonical = canonicalString('arrows', 'POST', '/pay', '1700', 'n1', hashBody({ a: 1 }));

    it('accepts a signature produced with the current secret', () => {
      const pair: ServiceKeyPair = { current: 'k'.repeat(32) };
      const sig = sign(pair.current, canonical);
      expect(verifySignature(pair, canonical, sig)).toBe(true);
    });

    it('accepts a signature produced with the previous (rotation) secret', () => {
      const pair: ServiceKeyPair = { current: 'new'.repeat(12), previous: 'old'.repeat(12) };
      const sig = sign(pair.previous!, canonical);
      expect(verifySignature(pair, canonical, sig)).toBe(true);
    });

    it('rejects a signature from an unrelated secret', () => {
      const pair: ServiceKeyPair = { current: 'k'.repeat(32) };
      const forged = sign('attacker'.repeat(4), canonical);
      expect(verifySignature(pair, canonical, forged)).toBe(false);
    });

    it('rejects a valid signature when the canonical string is tampered', () => {
      const pair: ServiceKeyPair = { current: 'k'.repeat(32) };
      const sig = sign(pair.current, canonical);
      const tampered = canonical.replace('/pay', '/pay-attacker');
      expect(verifySignature(pair, tampered, sig)).toBe(false);
    });

    it('rejects a truncated signature without throwing (length guard)', () => {
      const pair: ServiceKeyPair = { current: 'k'.repeat(32) };
      const sig = sign(pair.current, canonical).slice(0, 10);
      expect(verifySignature(pair, canonical, sig)).toBe(false);
    });

    it('does not accept the previous key when it is absent', () => {
      const pair: ServiceKeyPair = { current: 'k'.repeat(32) };
      const sig = sign('rotated-away'.repeat(3), canonical);
      expect(verifySignature(pair, canonical, sig)).toBe(false);
    });
  });

  it('enforces a 60 second maximum clock skew', () => {
    expect(MAX_CLOCK_SKEW_MS).toBe(60_000);
  });
});
