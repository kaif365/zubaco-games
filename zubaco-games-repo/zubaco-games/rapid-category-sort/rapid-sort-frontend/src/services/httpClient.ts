import axios from 'axios';
import { encryptPayload, decryptPayload, isEncryptedPayload } from './crypto';

const ENCRYPTION_ENABLED = import.meta.env.VITE_ENCRYPTION_ENABLED !== 'false';
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || '';

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3008',
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use(async (config) => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || sessionStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    sessionStorage.setItem('auth_token', token);
  }
  if (ENCRYPTION_ENABLED && ENCRYPTION_KEY && config.data != null && !isEncryptedPayload(config.data)) {
    config.data = await encryptPayload(config.data, ENCRYPTION_KEY);
  }
  return config;
});

httpClient.interceptors.response.use(async (response) => {
  if (ENCRYPTION_ENABLED && ENCRYPTION_KEY && isEncryptedPayload(response.data)) {
    response.data = await decryptPayload(response.data, ENCRYPTION_KEY);
  }
  return response;
});

export default httpClient;
