import { AUTH_TOKEN_KEY, refreshDevSessionAuth } from '@/lib/devSessionAuth'; // TODO(temp): 401 dev-session refresh
import { decryptPayload, encryptPayload, isEncryptedPayload } from '@/utils/encryption';

type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  message?: string;
  code?: string;
  data: T;
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getEncryptionKey(): string | null {
  return import.meta.env.VITE_ENCRYPTION_KEY ?? null;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) throw new Error('Missing VITE_API_BASE_URL');

  const hexKey = getEncryptionKey();

  let body = init.body as string | undefined;
  if (hexKey && body != null) {
    const parsed: unknown = JSON.parse(body);
    const encrypted = await encryptPayload(parsed, hexKey);
    body = JSON.stringify(encrypted);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    body,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(init.headers ?? {}),
    },
  });

  // TODO(temp): 401 dev-session refresh — remove when real auth is in place
  if (response.status === 401) { try { await refreshDevSessionAuth(); } catch { /* ignore */ } window.dispatchEvent(new CustomEvent('app:unauthorized')); throw new Error('Session expired. Please try again.'); }
  // end TODO(temp)

  const raw = (await response.json().catch(() => null)) as unknown;
  let payload: unknown = raw;

  if (hexKey && isEncryptedPayload(payload)) {
    try {
      payload = await decryptPayload(payload, hexKey);
    } catch (err) {
      throw new Error(
        `Failed to decrypt response: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    }
  }

  const envelope = payload as Partial<ApiEnvelope<unknown>> | null;
  if (!response.ok || !envelope?.success) {
    throw new Error(envelope?.message ?? `Request failed with status ${String(response.status)}`);
  }
  return envelope.data as T;
}

export function get<T>(path: string, init?: Omit<RequestInit, 'method'>): Promise<T> {
  return request<T>(path, { ...init, method: 'GET' });
}

export function post<T>(
  path: string,
  payload?: unknown,
  init?: Omit<RequestInit, 'method' | 'body'>,
): Promise<T> {
  return request<T>(path, {
    ...init,
    method: 'POST',
    body: payload != null ? JSON.stringify(payload) : undefined,
  });
}
