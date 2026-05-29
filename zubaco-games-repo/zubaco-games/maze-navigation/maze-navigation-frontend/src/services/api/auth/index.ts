import {
  clearSessionToken,
  hydrateSessionTokenFromStorage,
  readSessionToken,
  writeSessionToken,
} from "@/lib/auth";
import { logger } from "@/lib/default-logger";
import { retryOnConnectionFailure } from "@/services/connection-retry";
import URL from "@/services/urls";
import { appConfig } from "@app/config/appConfig";

export function resolveDevSessionBase(): string {
  const authURL = appConfig.api.mockUserSessionUrl;
  return authURL.length > 0 ? authURL : appConfig.api.baseUrl;
}

export interface DevSessionUserDto {
  id: string;
  name: string;
}

export interface DevSessionDataDto {
  token: string;
  expiresAt: string;
  stageId: string;
  user: DevSessionUserDto;
}

interface DevSessionApiEnvelope {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: DevSessionDataDto;
}

let sessionRefreshPromise: Promise<string> | null = null;

function resolveDevSessionUrl(): string {
  const base = resolveDevSessionBase().replace(/\/+$/, "");
  const path = URL.USER_AUTH_DEV_SESSION.replace(/^\/+/, "");
  return `${base}/${path}`;
}

/** POST dev-session via fetch so auth bootstrap/recovery bypass axios interceptors. */
export async function fetchDevSession(
  stageId: string,
): Promise<DevSessionDataDto> {
  const response = await retryOnConnectionFailure(() =>
    fetch(resolveDevSessionUrl(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stageId }),
    }),
  );

  const envelope = (await response.json()) as DevSessionApiEnvelope;
  logger.debug("Auth session response envelope", envelope);

  if (!response.ok || !envelope.success || !envelope.data?.token) {
    throw new Error(envelope.message ?? "Failed to start user session");
  }

  return envelope.data;
}

/** Returns an existing stored token or creates one from dev-session bootstrap. */
export async function ensureDevSessionToken(stageId: string): Promise<string> {
  await hydrateSessionTokenFromStorage();
  const existingToken = readSessionToken();
  if (existingToken) {
    return existingToken;
  }

  return refreshDevSessionToken(stageId);
}

/** Clears stale auth, fetches one fresh dev-session, and shares it across callers. */
export async function refreshDevSessionToken(
  stageId = appConfig.stage.id,
): Promise<string> {
  clearSessionToken();

  if (!sessionRefreshPromise) {
    sessionRefreshPromise = fetchDevSession(stageId)
      .then(async (data) => {
        await writeSessionToken(data.token);
        return data.token;
      })
      .catch((error: unknown) => {
        clearSessionToken();
        throw error;
      })
      .finally(() => {
        sessionRefreshPromise = null;
      });
  }

  return sessionRefreshPromise;
}
