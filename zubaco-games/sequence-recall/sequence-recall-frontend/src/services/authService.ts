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
 * Fetch dev session.
 *
 * @param {string} stageId - The stage id.
 *
 * @returns {Promise<DevSessionData>} A promise that resolves with the result.
 */
export async function fetchDevSession(stageId: string): Promise<DevSessionData> {
  const res = await fetch(`${MOCK_USER_BASE}/user/auth/dev-session`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stageId }),
  });

  if (!res.ok) {
    throw new Error(`Mock auth request failed: HTTP ${String(res.status)}`);
  }

  const body = (await res.json()) as unknown;

  if (!isDevSessionEnvelope(body)) {
    throw new Error('Invalid dev-session response shape');
  }

  if (!body.success) {
    throw new Error(body.message || 'Mock auth returned unsuccessful response');
  }

  return body.data;
}
