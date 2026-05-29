import { LRUCache } from "lru-cache";

import type { AdminData } from "../../admin/http/admin-http.service";
import type { UserData } from "../../user/http/user-http.service";
import { AUTH_CACHE_CONFIGS } from "../constants";

type CachedAuth =
  | { kind: "user"; data: UserData }
  | { kind: "admin"; data: AdminData };

// Single in-process cache shared by both user and admin verification paths.
// Keyed by the raw Bearer token — if the token changes (re-login, rotation)
// the old entry simply misses and a fresh lookup is performed.
// TTL per entry is min(token remaining lifetime, AUTH_CACHE_CONFIGS.MAX_TTL_MS)
// so entries never outlive the token itself, and long-lived tokens are still
// capped to bound staleness when a session is revoked server-side.
const cache = new LRUCache<string, CachedAuth>({
  max: AUTH_CACHE_CONFIGS.MAX_ENTRIES,
  ttlAutopurge: true,
});

/**
 * Compute cache TTL for a token given its JWT exp claim (seconds since epoch).
 * Returns the lesser of the token's remaining lifetime and MAX_TTL_MS.
 *
 * @param {number} expSec - JWT exp claim value in seconds since Unix epoch.
 *
 * @returns {number} The token ttl result.
 */
function tokenTtl(expSec: number): number {
  const remaining = expSec * 1000 - Date.now();
  return Math.max(1, Math.min(remaining, AUTH_CACHE_CONFIGS.MAX_TTL_MS));
}

/**
 * Retrieve a cached user by bearer token.
 *
 * @param {string} token - raw Bearer token used as cache key.
 *
 * @returns {UserData | undefined} The get cached user result.
 */
export function getCachedUser(token: string): UserData | undefined {
  const entry = cache.get(token);
  return entry?.kind === "user" ? entry.data : undefined;
}

/**
 * Store a verified user in the cache, keyed by bearer token.
 *
 * @param {string} token - raw Bearer token used as cache key.
 * @param {UserData} data - verified user data to cache.
 * @param {number} expSec - JWT exp claim value in seconds since Unix epoch.
 *
 * @returns {void} Resolves when the operation completes.
 */
export function setCachedUser(
  token: string,
  data: UserData,
  expSec: number,
): void {
  cache.set(token, { kind: "user", data }, { ttl: tokenTtl(expSec) });
}

/**
 * Retrieve a cached admin by bearer token.
 *
 * @param {string} token - raw Bearer token used as cache key.
 *
 * @returns {AdminData | undefined} The get cached admin result.
 */
export function getCachedAdmin(token: string): AdminData | undefined {
  const entry = cache.get(token);
  return entry?.kind === "admin" ? entry.data : undefined;
}

/**
 * Store a verified admin in the cache, keyed by bearer token.
 *
 * @param {string} token - raw Bearer token used as cache key.
 * @param {AdminData} data - verified admin data to cache.
 * @param {number} expSec - JWT exp claim value in seconds since Unix epoch.
 *
 * @returns {void} Resolves when the operation completes.
 */
export function setCachedAdmin(
  token: string,
  data: AdminData,
  expSec: number,
): void {
  cache.set(token, { kind: "admin", data }, { ttl: tokenTtl(expSec) });
}
