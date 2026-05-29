import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import { appConfig } from '@app/config/appConfig';
import { encryptPayload, decryptPayload, isEncryptedPayload } from '@utils/crypto';
import { storage } from '@utils/storage';

// Paths where a fresh session can be created transparently after re-auth
const RETRYABLE_PATHS = ['/v1/game/game-start', '/v1/user/demo'];

interface GameRequestConfig extends AxiosRequestConfig {
  _retried?: boolean;
}

// ── In-memory auth store ─────────────────────────────────────────────────────
let _authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  _authToken = token;
}

export function getAuthToken(): string | null {
  return _authToken;
}

type EnvelopeLike = {
  success: boolean;
  statusCode: number;
  message?: string;
  data: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEnvelopeLike(value: unknown): value is EnvelopeLike {
  if (!isRecord(value)) return false;
  return (
    typeof value.success === 'boolean' &&
    typeof value.statusCode === 'number' &&
    'data' in value
  );
}

// ── Generic HTTP Client (legacy, uses VITE_API_BASE_URL) ─────────────────────
const httpClient: AxiosInstance = axios.create({
  baseURL: appConfig.api.baseUrl,
  timeout: appConfig.api.timeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

httpClient.interceptors.request.use(
  (config) => {
    const token = _authToken ?? localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error instanceof Error ? error : new Error(String(error))),
);

httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const payload: unknown = response.data;
    if (isEnvelopeLike(payload)) {
      response.data = payload.data;
    }
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        _authToken = null;
        localStorage.removeItem('auth_token');
      }
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  },
);

// ── Game API Client (VITE_GAME_API_URL) ──────────────────────────────────────
export const gameHttpClient: AxiosInstance = axios.create({
  baseURL: appConfig.game.apiUrl,
  timeout: appConfig.api.timeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-API-KEY': appConfig.fileUpload.apiKey,
  },
});

gameHttpClient.interceptors.request.use(async (config) => {
  if (_authToken) {
    config.headers.Authorization = `Bearer ${_authToken}`;
  }

  const gameConfig = config as GameRequestConfig;
  if (
    appConfig.encryption.enabled &&
    config.data !== undefined &&
    config.data !== null &&
    !gameConfig._retried
  ) {
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

      // Clear stale token and session — the backend already invalidated both
      _authToken = null;
      storage.clearLiveSession();

      // Re-authenticate silently
      try {
        const res = await usersHttpClient.post<{ data: { token: string } }>(
          '/user/auth/dev-session',
          { stageId: appConfig.game.stageId },
        );
        setAuthToken(res.data.data.token);
      } catch {
        // Re-auth itself failed — surface the original 401 to the caller
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }

      // Retry transparently only for session-creating endpoints
      if (config && !config._retried && RETRYABLE_PATHS.some((p) => config.url === p)) {
        config._retried = true;
        return gameHttpClient.request(config);
      }
    }

    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  },
);

// ── Users API Client (VITE_USERS_API_URL) ────────────────────────────────────
export const usersHttpClient: AxiosInstance = axios.create({
  baseURL: appConfig.game.usersApiUrl,
  timeout: appConfig.api.timeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

usersHttpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  },
);

// ── Typed helpers ────────────────────────────────────────────────────────────
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.get<T>(url, config);
  return response.data;
}

export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await httpClient.post<T>(url, data, config);
  return response.data;
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.put<T>(url, data, config);
  return response.data;
}

export async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await httpClient.patch<T>(url, data, config);
  return response.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.delete<T>(url, config);
  return response.data;
}

export { httpClient };
