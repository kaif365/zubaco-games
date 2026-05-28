import { ENCRYPTION_KEY, IS_ENCRYPTION_ENABLED } from '@/constants/api';
import {
  isDevSessionRequestUrl,
  readSessionToken,
} from '@/lib/auth';
import { refreshDevSessionToken } from '@/services/api/auth';
import { isConnectionFailure } from '@/services/connection-retry';
import { decryptPayload, encryptPayload, isEncryptedPayload } from '@/utils/crypto';
import { appConfig } from '@app/config/appConfig';
import axiosLib, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

const CONNECTION_RETRY_COUNT_KEY = '__mazeConnectionRetryCount__' as const;
const CONNECTION_RETRY_LIMIT = 3;
const CONNECTION_RETRY_INTERVAL_MS = 1000;
const TOKEN_RETRY_KEY = '__mazeTokenRetryDone__' as const;

export const resolveGameApiBase = (): string => appConfig.api.baseUrl;

export const resolveAdminBase = (): string => {
  const admin = appConfig.api.adminBaseUrl;
  return admin.length > 0 ? admin : resolveGameApiBase();
};

export const BASE_URL = resolveGameApiBase();

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, '');

function isGameApiRequest(config: InternalAxiosRequestConfig): boolean {
  if (isDevSessionRequestUrl(config.url)) {
    return false;
  }
  const base = normalizeBaseUrl(config.baseURL ?? BASE_URL);
  if (base === normalizeBaseUrl(resolveAdminBase())) {
    return false;
  }
  const path = (config.url ?? '').toLowerCase();
  if (path.includes('/admin/')) {
    return false;
  }
  return true;
}

const axiosClient = axiosLib.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

function waitForConnectionRetry(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, CONNECTION_RETRY_INTERVAL_MS);
  });
}

axiosClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = readSessionToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    if (
      IS_ENCRYPTION_ENABLED &&
      isGameApiRequest(config) &&
      config.data != null &&
      !isEncryptedPayload(config.data)
    ) {
      if (!ENCRYPTION_KEY) {
        throw new Error('VITE_ENCRYPTION_KEY is required when encryption is enabled');
      }
      config.data = await encryptPayload(config.data, ENCRYPTION_KEY);
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error instanceof Error ? error : new Error(String(error))),
);

axiosClient.interceptors.response.use(
  async (response) => {
    if (
      IS_ENCRYPTION_ENABLED &&
      ENCRYPTION_KEY &&
      isGameApiRequest(response.config) &&
      isEncryptedPayload(response.data)
    ) {
      response.data = await decryptPayload(response.data, ENCRYPTION_KEY);
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as
      | (InternalAxiosRequestConfig & {
          [CONNECTION_RETRY_COUNT_KEY]?: number;
          [TOKEN_RETRY_KEY]?: boolean;
        })
      | undefined;
    const status = error.response?.status;
    const connectionRetryCount = config?.[CONNECTION_RETRY_COUNT_KEY] ?? 0;

    if (
      config &&
      isConnectionFailure(error) &&
      connectionRetryCount < CONNECTION_RETRY_LIMIT
    ) {
      config[CONNECTION_RETRY_COUNT_KEY] = connectionRetryCount + 1;
      await waitForConnectionRetry();
      return axiosClient.request(config);
    }

    if (
      status !== 401 ||
      !config ||
      config[TOKEN_RETRY_KEY] ||
      isDevSessionRequestUrl(config.url)
    ) {
      throw error;
    }

    config[TOKEN_RETRY_KEY] = true;

    try {
      const token = await refreshDevSessionToken();
      const headers = AxiosHeaders.from(config.headers ?? {});
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
      return axiosClient.request(config);
    } catch {
      throw error;
    }
  },
);

export default axiosClient;
