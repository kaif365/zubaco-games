import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { appConfig } from '@/app/config/appConfig';
import { encryptPayload, decryptPayload, isEncryptedPayload } from '@/utils/crypto';
import { storage } from '@/utils/storage';

const RETRYABLE_PATHS = ['/v1/game/game-start', '/v1/user/demo'];

interface GameRequestConfig extends AxiosRequestConfig {
  _retried?: boolean;
}

// ── In-memory auth store ──────────────────────────────────────────────────────
let _authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  _authToken = token;
}

export function getAuthToken(): string | null {
  return _authToken;
}

type EnvelopeLike = { success: boolean; statusCode: number; data: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isEnvelopeLike(v: unknown): v is EnvelopeLike {
  if (!isRecord(v)) return false;
  return typeof v.success === 'boolean' && typeof v.statusCode === 'number' && 'data' in v;
}

// ── Game API client ───────────────────────────────────────────────────────────
export const gameHttpClient: AxiosInstance = axios.create({
  baseURL: appConfig.game.apiUrl,
  timeout: appConfig.api.timeout,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

gameHttpClient.interceptors.request.use(async (config) => {
  if (_authToken) config.headers.Authorization = `Bearer ${_authToken}`;

  const gc = config as GameRequestConfig;
  if (appConfig.encryption.enabled && config.data != null && !gc._retried) {
    config.data = await encryptPayload(config.data, appConfig.encryption.key);
  }
  return config;
});

gameHttpClient.interceptors.response.use(
  async (response: AxiosResponse) => {
    if (appConfig.encryption.enabled && isEncryptedPayload(response.data)) {
      response.data = await decryptPayload(response.data, appConfig.encryption.key);
    }
    return response;
  },
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const config = error.config as GameRequestConfig | undefined;
      _authToken = null;
      storage.clearLiveSession();

      try {
        const res = await usersHttpClient.post<{ data: { token: string } }>(
          '/user/auth/dev-session',
          { stageId: appConfig.game.stageId },
        );
        setAuthToken(res.data.data.token);
      } catch {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }

      if (config && !config._retried && RETRYABLE_PATHS.some((p) => config.url === p)) {
        config._retried = true;
        return gameHttpClient.request(config);
      }
    }

    // Surface the server's message field (422, 500, etc.) instead of the generic axios string.
    if (axios.isAxiosError(error) && error.response) {
      const body = error.response.data as Record<string, unknown> | undefined;

      // Preserve the original AxiosError for clearData responses so the game
      // session hook can detect clearData:true and wipe local storage.
      if (isRecord(body?.data) && (body.data as Record<string, unknown>).clearData === true) {
        return Promise.reject(error);
      }

      const serverMsg = typeof body?.message === 'string' ? body.message : undefined;
      const status = error.response.status;
      const fallback = `Request failed with status code ${String(status)}`;
      return Promise.reject(new Error(serverMsg ?? fallback));
    }

    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  },
);

// ── Users API client ──────────────────────────────────────────────────────────
export const usersHttpClient: AxiosInstance = axios.create({
  baseURL: appConfig.game.usersApiUrl,
  timeout: appConfig.api.timeout,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

usersHttpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => Promise.reject(error instanceof Error ? error : new Error(String(error))),
);

// ── Generic HTTP client (legacy) ──────────────────────────────────────────────
export const httpClient: AxiosInstance = axios.create({
  baseURL: appConfig.api.baseUrl,
  timeout: appConfig.api.timeout,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

httpClient.interceptors.request.use((config) => {
  const token = _authToken ?? localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const payload: unknown = response.data;
    if (isEnvelopeLike(payload)) response.data = payload.data;
    return response;
  },
  (error: unknown) => Promise.reject(error instanceof Error ? error : new Error(String(error))),
);
