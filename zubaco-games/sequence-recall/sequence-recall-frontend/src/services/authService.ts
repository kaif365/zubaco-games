const MOCK_USER_BASE = import.meta.env.VITE_MOCK_USER_URL;

type DevSessionData = {
  token: string;
  expiresAt: string;
  stageId: string;
  user: { id: string; name: string };
};

type DevSessionEnvelope = {
  success: boolean;
  statusCode: number;
  message: string;
  data: DevSessionData;
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
 * Checks whether dev session data.
 *
 * @param {unknown} value - The value.
 *
 * @returns {boolean} The result of isDevSessionData.
 */
function isDevSessionData(value: unknown): value is DevSessionData {
  if (!isRecord(value) || !isRecord(value.user)) return false;

  return (
    typeof value.token === 'string' &&
    typeof value.expiresAt === 'string' &&
    typeof value.stageId === 'string' &&
    typeof value.user.id === 'string' &&
    typeof value.user.name === 'string'
  );
}

/**
 * Checks whether dev session envelope.
 *
 * @param {unknown} value - The value.
 *
 * @returns {boolean} The result of isDevSessionEnvelope.
 */
function isDevSessionEnvelope(value: unknown): value is DevSessionEnvelope {
  return (
    isRecord(value) &&
    typeof value.success === 'boolean' &&
    typeof value.statusCode === 'number' &&
    typeof value.message === 'string' &&
    isDevSessionData(value.data)
  );
}

/**
 * Fetch dev session with resilient fallback for standalone manual testing.
 *
 * @param {string} stageId - The stage id.
 *
 * @returns {Promise<DevSessionData>} A promise that resolves with the result.
 */
export async function fetchDevSession(stageId: string): Promise<DevSessionData> {
  const fallbackSession: DevSessionData = {
    token: 'dev-standalone-token',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    stageId: stageId || 'dev-stage-1',
    user: { id: 'dev-user-1', name: 'Test Player' },
  };

  if (!MOCK_USER_BASE) {
    return fallbackSession;
  }

  try {
    const res = await fetch(`${MOCK_USER_BASE}/user/auth/dev-session`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stageId }),
    });

    if (!res.ok) {
      return fallbackSession;
    }

    const body = (await res.json()) as unknown;

    if (!isDevSessionEnvelope(body) || !body.success) {
      return fallbackSession;
    }

    return body.data;
  } catch {
    return fallbackSession;
  }
}
