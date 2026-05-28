import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { encryptPayload, decryptPayload, isEncryptedPayload } from './crypto';

import { appConfig } from '@app/config/appConfig';

const ENCRYPTION_ENABLED = import.meta.env.VITE_ENCRYPTION_ENABLED !== 'false';
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || '';

const httpClient: AxiosInstance = axios.create({
  baseURL: appConfig.api.baseUrl,
  timeout: appConfig.api.timeout,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

httpClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (ENCRYPTION_ENABLED && ENCRYPTION_KEY && config.data != null && !isEncryptedPayload(config.data)) {
    config.data = await encryptPayload(config.data, ENCRYPTION_KEY);
  }
  return config;
});

httpClient.interceptors.response.use(
  async (response) => {
    if (ENCRYPTION_ENABLED && ENCRYPTION_KEY && isEncryptedPayload(response.data)) {
      response.data = await decryptPayload(response.data, ENCRYPTION_KEY);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  },
);

export { httpClient };
