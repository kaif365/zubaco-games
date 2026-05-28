import { authedFetch } from '@/app/api/httpClient';
import { decryptPayload, encryptPayload, isEncryptedPayload } from '@/utils/payloadCrypto';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// TODO(temp): 401 dev-session refresh — remove when real auth is in place
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(fn: UnauthorizedHandler): void { unauthorizedHandler = fn; }
// end TODO(temp)

interface ApiRequestOptions<TBody> {
  baseUrl: string;
  path: string;
  method: HttpMethod;
  body?: TBody;
  useAuth?: boolean;
  /** When set, JSON request bodies are encrypted and JSON responses shaped as `{ iv, ciphertext, tag }` are decrypted (game service contract). */
  symmetricPayloadCryptoKey?: string;
}

/**
 * Joins base URL and path, normalizing slashes.
 *
 * @param {string} baseUrl - The service base URL.
 * @param {string} path - The API path to append.
 *
 * @returns {string} The fully qualified URL.
 */
function buildUrl(baseUrl: string, path: string) {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${base}${path}`;
}

/**
 * Sends JSON over HTTP, optionally encrypting the body and decrypting encrypted JSON responses.
 *
 * @param {ApiRequestOptions<TBody>} options - Method, URLs, body, auth, and optional crypto key.
 *
 * @returns {Promise<TResponse>} Parsed JSON response body.
 */
async function request<TResponse, TBody = undefined>(
  options: ApiRequestOptions<TBody>,
): Promise<TResponse> {
  const { baseUrl, path, method, body, useAuth = true, symmetricPayloadCryptoKey } = options;
  const url = buildUrl(baseUrl, path);
  const headers = new Headers({
    accept: '*/*',
  });

  let wireBody: unknown = body;
  if (body !== undefined && symmetricPayloadCryptoKey) {
    wireBody = await encryptPayload(body, symmetricPayloadCryptoKey);
  }
  if (wireBody !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchImpl = useAuth ? authedFetch : fetch;
  const response = await fetchImpl(url, {
    method,
    headers,
    body: wireBody === undefined ? undefined : JSON.stringify(wireBody),
  });

  if (response.status === 401) { unauthorizedHandler?.(); throw new Error(`HTTP ${method} ${path} failed with 401`); } // TODO(temp): 401 dev-session refresh

  if (!response.ok) {
    let message = `HTTP ${method} ${path} failed with ${response.status}`;
    try {
      const errJson = (await response.json()) as { message?: string };
      if (errJson.message) message = errJson.message;
    } catch {
      // ignore JSON parse failures — keep the generic message
    }
    throw new Error(message);
  }

  let parsed: unknown = await response.json();
  if (symmetricPayloadCryptoKey && isEncryptedPayload(parsed)) {
    parsed = await decryptPayload(parsed, symmetricPayloadCryptoKey);
  }

  return parsed as TResponse;
}

/**
 * Sends a GET request and returns parsed JSON.
 *
 * @param {Omit<ApiRequestOptions<undefined>, 'method'>} options - Base URL, path, auth, crypto flags.
 *
 * @returns {Promise<TResponse>} Parsed JSON body.
 */
export function apiGet<TResponse>(options: Omit<ApiRequestOptions<undefined>, 'method'>) {
  return request<TResponse, undefined>({ ...options, method: 'GET' });
}

/**
 * Sends a POST request with an optional JSON body and returns parsed JSON.
 *
 * @param {Omit<ApiRequestOptions<TBody>, 'method'>} options - Request configuration including body.
 *
 * @returns {Promise<TResponse>} Parsed JSON body.
 */
export function apiPost<TResponse, TBody>(options: Omit<ApiRequestOptions<TBody>, 'method'>) {
  return request<TResponse, TBody>({ ...options, method: 'POST' });
}

/**
 * Sends a PUT request with an optional JSON body and returns parsed JSON.
 *
 * @param {Omit<ApiRequestOptions<TBody>, 'method'>} options - Request configuration including body.
 *
 * @returns {Promise<TResponse>} Parsed JSON body.
 */
export function apiPut<TResponse, TBody>(options: Omit<ApiRequestOptions<TBody>, 'method'>) {
  return request<TResponse, TBody>({ ...options, method: 'PUT' });
}

/**
 * Sends a PATCH request with an optional JSON body and returns parsed JSON.
 *
 * @param {Omit<ApiRequestOptions<TBody>, 'method'>} options - Request configuration including body.
 *
 * @returns {Promise<TResponse>} Parsed JSON body.
 */
export function apiPatch<TResponse, TBody>(options: Omit<ApiRequestOptions<TBody>, 'method'>) {
  return request<TResponse, TBody>({ ...options, method: 'PATCH' });
}
