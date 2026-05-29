import axios from 'axios';
import { encryptPayload, decryptPayload, isEncryptedPayload } from './crypto';

const ENCRYPTION_ENABLED = import.meta.env.VITE_ENCRYPTION_ENABLED !== 'false';
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || '';

// Dev auto-token: generate a JWT signed with the known dev secret
async function getOrCreateDevToken(): Promise<string> {
  const existing = sessionStorage.getItem('auth_token');
  if (existing) return existing;

  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('token');
  if (urlToken) {
    sessionStorage.setItem('auth_token', urlToken);
    return urlToken;
  }

  // Auto-generate a dev JWT (only works with dev-secret backend)
  const secret = 'dev-secret-colour-sorting';
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: 'dev-player-001',
    username: 'DevPlayer',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
  };

  const b64url = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const headerB64 = b64url(header);
  const payloadB64 = b64url(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const token = `${signingInput}.${sigB64}`;
  sessionStorage.setItem('auth_token', token);
  return token;
}

// Initialize token immediately
const tokenPromise = getOrCreateDevToken();

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3006/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use(async (config) => {
  const token = await tokenPromise;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
