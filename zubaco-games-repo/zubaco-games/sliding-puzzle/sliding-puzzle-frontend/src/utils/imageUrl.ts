import { appConfig } from '@app/config/appConfig';

/**
 * Resolve a potentially-relative image URL against the CDN base.
 * Matches the test client's `resolveImageUrl()` behavior exactly.
 */
export function resolveImageUrl(imageUrl: string): string {
  const raw = imageUrl.trim();
  if (!raw) return '';

  // Already absolute
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith('//')) return `${globalThis.location.protocol}${raw}`;

  // Root-relative path — local public asset, resolve against current origin
  if (raw.startsWith('/')) return `${globalThis.location.origin}${raw}`;

  const base = appConfig.game.cdnBaseUrl || appConfig.game.apiUrl || globalThis.location.origin;
  const path = raw.replace(/^\/+/, '');
  return `${base}/${path}`;
}
