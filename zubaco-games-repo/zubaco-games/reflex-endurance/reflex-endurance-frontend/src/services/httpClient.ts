import axios from 'axios';
import { encryptPayload, decryptPayload, isEncryptedPayload } from './crypto';

const ENCRYPTION_ENABLED = import.meta.env.VITE_ENCRYPTION_ENABLED !== 'false';
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || '';

const httpClient = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3020' });

httpClient.interceptors.request.use(async (c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  if (ENCRYPTION_ENABLED && ENCRYPTION_KEY && c.data != null && !isEncryptedPayload(c.data)) {
    c.data = await encryptPayload(c.data, ENCRYPTION_KEY);
  }
  return c;
});

httpClient.interceptors.response.use(async (response) => {
  if (ENCRYPTION_ENABLED && ENCRYPTION_KEY && isEncryptedPayload(response.data)) {
    response.data = await decryptPayload(response.data, ENCRYPTION_KEY);
  }
  return response;
});

export default httpClient;
