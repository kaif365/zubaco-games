/** Default CloudFront origin for Memory Card Matching image keys from the API. */
const DEFAULT_MCM_CDN_BASE = "https://dy47qp4b6jtbv.cloudfront.net";

function normalizeBaseUrl(base: string): string {
  return base.trim().replace(/\/+$/, "");
}

/**
 * Builds a browser-loadable image URL for an MCM asset key or path from the backend.
 *
 * - If the value is already an absolute `http:` or `https:` URL, it is returned unchanged.
 * - Otherwise it is joined with the CDN base (single slash between base and path).
 *
 * Override base with `NEXT_PUBLIC_MCM_CDN_BASE_URL` when set (no trailing slash required).
 */
export function resolveMemoryCardAssetUrl(keyOrUrl: string): string {
  const trimmed = keyOrUrl.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const envBase = process.env.NEXT_PUBLIC_MCM_CDN_BASE_URL?.trim();
  const base = normalizeBaseUrl(envBase || DEFAULT_MCM_CDN_BASE);
  const path = trimmed.replace(/^\/+/, "");
  return `${base}/${path}`;
}
