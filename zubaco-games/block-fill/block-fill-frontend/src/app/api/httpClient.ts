import { getAuthToken } from '@/app/authSession';

/**
 * Wraps `fetch` and attaches `Authorization: Bearer` when a valid session token exists.
 *
 * @param {RequestInfo | URL} input - Same as `fetch` first argument.
 * @param {RequestInit} [init] - Same as `fetch` second argument.
 *
 * @returns {Promise<Response>} The fetch response.
 */
export async function authedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
