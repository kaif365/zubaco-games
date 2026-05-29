import { appConfig } from '@/app/config/appConfig';
import { usersHttpClient } from '@/services/httpClient';
import type { DevSessionResponse } from '../types';

export async function getDevSession(stageId: string): Promise<DevSessionResponse> {
  if (appConfig.mock.enabled) {
    // Return a mock token immediately when backend is not available
    await new Promise((r) => setTimeout(r, 150));
    return { token: `mock-token-${stageId}-${Date.now().toString(36)}` };
  }
  const res = await usersHttpClient.post<{ data: DevSessionResponse }>(
    '/user/auth/dev-session',
    { stageId },
  );
  return res.data.data;
}
