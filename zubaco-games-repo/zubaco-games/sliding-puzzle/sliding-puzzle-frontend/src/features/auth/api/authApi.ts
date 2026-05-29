import { usersHttpClient } from '@/services/httpClient';
import type { DevSessionResponse } from '@/types/sliding-puzzle';

/**
 * Get a dev session JWT token from the Users Service.
 * Matches test client: POST /user/auth/dev-session { stageId }
 */
export async function getDevSession(stageId: string): Promise<DevSessionResponse> {
  const response = await usersHttpClient.post<{ data: DevSessionResponse }>(
    '/user/auth/dev-session',
    { stageId },
  );
  return response.data.data;
}
