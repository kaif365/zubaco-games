import { appEnv } from '@/app/config/env';
import { apiPost } from '@/app/api/apiClient';
import { API_ENDPOINTS } from '@/app/api/endpoints';
import {
  clearAuthSession,
  getStoredAuthSession,
  isAuthSessionValid,
  saveAuthSession,
  type UserAuthSession,
} from '@/app/authSession';

interface DevSessionResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: UserAuthSession;
}

/**
 * Calls the dev-session endpoint for the given stage and returns the auth session on success.
 *
 * @param {string} stageId - The stage ID to create a session for.
 *
 * @returns {Promise<UserAuthSession>} The created auth session.
 */
export async function createDevSession(stageId: string) {
  const payload = await apiPost<DevSessionResponse, { stageId: string }>({
    baseUrl: appEnv.userServiceBaseUrl,
    path: API_ENDPOINTS.userAuth.devSession,
    body: { stageId },
    useAuth: false,
  });
  if (!payload.success || !payload.data?.token) {
    throw new Error(payload.message || 'Invalid dev session response');
  }

  return payload.data;
}

/**
 * Returns the stored valid session for the current stage, or creates and stores a new dev session.
 *
 * @returns {Promise<UserAuthSession>} The valid auth session (stored or newly created).
 */
export async function ensureDevSession() {
  const stageId = appEnv.userStageId;
  if (!stageId) {
    throw new Error('Missing VITE_USER_STAGE_ID environment variable');
  }
  if (!appEnv.userServiceBaseUrl) {
    throw new Error('Missing VITE_USER_SERVICE_BASE_URL environment variable');
  }

  const storedSession = getStoredAuthSession();
  if (storedSession && isAuthSessionValid(storedSession) && storedSession.stageId === stageId) {
    return storedSession;
  }

  if (storedSession && !isAuthSessionValid(storedSession)) {
    clearAuthSession();
  }

  const session = await createDevSession(stageId);
  saveAuthSession(session);
  return session;
}
