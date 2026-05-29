import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-toastify';

import { STORAGE_KEYS } from '@/constants/storageKeys'; // TODO(temp): 401 dev-session refresh
import { fetchDevSession } from '@/services/authService'; // TODO(temp): 401 dev-session refresh
import { ApiRequestError } from '@/types/api.types';
import { decryptPayload, encryptPayload, isEncryptedPayload } from '@/utils/encryption';
import { clearAuthStorage, storage } from '@/utils/storage';
import { appConfig } from '@app/config/appConfig';

const AUTH_RECOVERY_FLAG = 'ZUBACO-auth-recovery-attempted';
const UNAUTHORIZED_TOAST_ID = 'auth-unauthorized-error';

type EnvelopeLike = {
  success: boolean;
  statusCode: number;
  message?: string;
  code?: string;
  data: unknown;
};

/**
 * Checks whether record.
 *
 * @param {unknown} value - The value.
 *
 * @returns {boolean} The result of isRecord.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Checks whether envelope like.
 *
 * @param {unknown} value - The value.
 *
 * @returns {boolean} The result of isEnvelopeLike.
 */
function isEnvelopeLike(value: unknown): value is EnvelopeLike {
  if (!isRecord(value)) return false;
  return (
    typeof value.success === 'boolean' && typeof value.statusCode === 'number' && 'data' in value
  );
}

const httpClient: AxiosInstance = axios.create({
  baseURL: appConfig.api.baseUrl,
  timeout: appConfig.api.timeout,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// TODO(temp): 401 dev-session refresh — remove when real auth is in place
async function recoverFromUnauthorized(): Promise<void> {
  clearAuthStorage();
  sessionStorage.setItem(AUTH_RECOVERY_FLAG, 'true');
  try { const data = await fetchDevSession(appConfig.socket.stageId); await storage.setSecure(STORAGE_KEYS.AUTH_TOKEN, data.token); } catch { /* refresh failed — navigate anyway */ }
  toast.error('Your session has expired. Please try again.', { toastId: UNAUTHORIZED_TOAST_ID });
  window.location.href = '/';
}
// end TODO(temp)

// ─── Request: inject auth token + encrypt body ───────────────────────────────

httpClient.interceptors.request.use(
  async (config) => {
    const token = await storage.getSecure<string>('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (appConfig.encryption.enabled && config.data != null) {
      if (!appConfig.encryption.key) {
        throw new Error('VITE_PAYLOAD_AES_SECRET is required when encryption is enabled');
      }
      config.data = await encryptPayload(config.data, appConfig.encryption.key);
    }

    return config;
  },
  (error: unknown) =>
    Promise.reject(error instanceof Error ? error : new Error('Request interceptor failed')),
);

// ─── Response: decrypt + unwrap envelope + normalize errors ──────────────────

httpClient.interceptors.response.use(
  async (response: AxiosResponse) => {
    let payload: unknown = response.data;

    // When encryption is enabled, decrypt if the body matches the encrypted payload shape.
    // Shape check is sufficient — no need for the X-Payload-Encrypted header.
    if (appConfig.encryption.enabled && isEncryptedPayload(payload)) {
      try {
        payload = await decryptPayload(payload, appConfig.encryption.key);
      } catch (err) {
        return Promise.reject(
          new ApiRequestError(
            `Failed to decrypt response: ${err instanceof Error ? err.message : 'unknown error'}`,
            response.status,
          ),
        );
      }
    }

    // Detect standard backend envelope: { success, statusCode, message, data }
    if (isEnvelopeLike(payload)) {
      if (!payload.success) {
        return Promise.reject(
          new ApiRequestError(
            typeof payload.message === 'string' ? payload.message : 'Request failed',
            payload.statusCode,
            payload.code,
          ),
        );
      }
      // Unwrap: callers receive the inner `data` directly
      response.data = payload.data;
    } else {
      response.data = payload;
    }

    return response;
  },
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      let payload: unknown = error.response?.data;

      if (status === 401) {
        await recoverFromUnauthorized();
        return Promise.reject(new ApiRequestError('Unauthorized', 401));
      }

      // Try to decrypt an encrypted error body before reading the message
      if (
        appConfig.encryption.enabled &&
        error.response?.headers['x-payload-encrypted'] === 'true' &&
        isEncryptedPayload(payload)
      ) {
        try {
          payload = await decryptPayload(payload, appConfig.encryption.key);
        } catch {
          // Decryption failed — fall through and use the raw payload
        }
      }

      // Backend sent an error envelope
      if (isRecord(payload) && typeof payload.message === 'string') {
        return Promise.reject(
          new ApiRequestError(
            payload.message,
            status,
            typeof payload.code === 'string' ? payload.code : undefined,
          ),
        );
      }

      return Promise.reject(new ApiRequestError(error.message, status));
    }

    return Promise.reject(error instanceof Error ? error : new Error('HTTP request failed'));
  },
);

// ─── Typed helpers ───────────────────────────────────────────────────────────

/**
 * Gets .
 *
 * @param {string} url - The url.
 * @param {AxiosRequestConfig<any> | undefined} config - The config.
 *
 * @returns {Promise<T>} A promise that resolves with the result.
 */
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.get<T>(url, config);
  return response.data;
}

/**
 * Post.
 *
 * @param {string} url - The url.
 * @param {unknown} data - The data.
 * @param {AxiosRequestConfig<any> | undefined} config - The config.
 *
 * @returns {Promise<T>} A promise that resolves with the result.
 */
export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await httpClient.post<T>(url, data, config);
  return response.data;
}

/**
 * Put.
 *
 * @param {string} url - The url.
 * @param {unknown} data - The data.
 * @param {AxiosRequestConfig<any> | undefined} config - The config.
 *
 * @returns {Promise<T>} A promise that resolves with the result.
 */
export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.put<T>(url, data, config);
  return response.data;
}

/**
 * Patch.
 *
 * @param {string} url - The url.
 * @param {unknown} data - The data.
 * @param {AxiosRequestConfig<any> | undefined} config - The config.
 *
 * @returns {Promise<T>} A promise that resolves with the result.
 */
export async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await httpClient.patch<T>(url, data, config);
  return response.data;
}

/**
 * Del.
 *
 * @param {string} url - The url.
 * @param {AxiosRequestConfig<any> | undefined} config - The config.
 *
 * @returns {Promise<T>} A promise that resolves with the result.
 */
export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.delete<T>(url, config);
  return response.data;
}

export { httpClient };
