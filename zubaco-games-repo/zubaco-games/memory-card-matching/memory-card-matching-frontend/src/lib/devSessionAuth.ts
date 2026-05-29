/** Bearer token used by `httpClient` for game API calls. */
export const AUTH_TOKEN_KEY = 'ZUBACO_auth_token';

type DevSessionData = {
  token: string;
  expiresAt: string;
  stageId: string;
  user: {
    id: string;
    name: string;
  };
};

type DevSessionResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data: DevSessionData;
};

let devSessionPromise: Promise<string> | null = null;

function hasStoredToken(): boolean {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function resetDevSessionPromise(): void {
  devSessionPromise = null;
}

async function fetchDevSessionTokenOnce(mockUserUrl: string, stageId: string): Promise<string> {
  const response = await fetch(`${mockUserUrl}/user/auth/dev-session`, {
    method: 'POST',
    headers: {
      accept: '*/*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stageId }),
  });

  const body = (await response.json()) as DevSessionResponse;
  if (!response.ok || !body.success || !body.data?.token) {
    throw new Error(body?.message || 'Failed to fetch dev session token');
  }

  return body.data.token;
}

async function fetchDevSessionTokenCached(mockUserUrl: string, stageId: string): Promise<string> {
  if (!devSessionPromise) {
    devSessionPromise = (async () => fetchDevSessionTokenOnce(mockUserUrl, stageId))();
  }

  try {
    return await devSessionPromise;
  } catch (error) {
    devSessionPromise = null;
    throw error;
  }
}

/**
 * Ensures a dev bearer token exists (initial app load). Reuses one in-flight fetch.
 */
export async function ensureDevSessionAuth(): Promise<void> {
  const mockUserUrl = import.meta.env.VITE_MOCK_USER_URL;
  const stageId = import.meta.env.VITE_STAGE_ID;

  if (!mockUserUrl) throw new Error('Missing VITE_MOCK_USER_URL');
  if (!stageId) throw new Error('Missing VITE_STAGE_ID');

  if (!hasStoredToken()) {
    const token = await fetchDevSessionTokenCached(mockUserUrl, stageId);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
  if (hasStoredToken()) {
    devSessionPromise = null;
  }
}

/**
 * Clears the auth token, fetches a fresh dev-session JWT, and stores it.
 * Used after a failed game start so the retry can run as a new mock user.
 */
export async function refreshDevSessionAuth(): Promise<void> {
  const mockUserUrl = import.meta.env.VITE_MOCK_USER_URL;
  const stageId = import.meta.env.VITE_STAGE_ID;

  if (!mockUserUrl) throw new Error('Missing VITE_MOCK_USER_URL');
  if (!stageId) throw new Error('Missing VITE_STAGE_ID');

  clearAuthToken();
  resetDevSessionPromise();
  const token = await fetchDevSessionTokenOnce(mockUserUrl, stageId);
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  resetDevSessionPromise();
}
