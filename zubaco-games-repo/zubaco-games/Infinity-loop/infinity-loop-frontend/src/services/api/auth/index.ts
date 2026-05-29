import { STORAGE_KEYS } from "@/constants/storage";
import {
  clearAllAuthStorage,
  hydrateSessionTokenFromStorage,
  isTokenExpirationReached,
  readPersistedSession,
  readSessionToken,
  writePersistedSession,
  writeSessionToken,
} from "@/lib/auth";
import { logger } from "@/lib/default-logger";
import axiosClient, { resolveDevSessionBase } from "@/services/axios";
import URL from "@/services/endpoints";
import { handleServerError } from "@/services/service-error-handler";
import Storage from "@/utils/storage";

export interface StartUserSessionPayload {
  stageId: string;
}

export interface UserSessionUserDto {
  id: string;
  name: string;
}

export interface UserSessionDataDto {
  token: string;
  expiresAt: string;
  stageId: string;
  user: UserSessionUserDto;
}

interface UserSessionApiEnvelope {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: UserSessionDataDto;
}

export const startUserSession = async (
  payload: StartUserSessionPayload,
): Promise<UserSessionDataDto> => {
  try {
    const { data: envelope } = await axiosClient.post<UserSessionApiEnvelope>(
      URL.USER_AUTH_DEV_SESSION,
      payload,
      { baseURL: resolveDevSessionBase() },
    );
    logger.debug("Auth session response envelope", envelope);
    if (!envelope.success || !envelope.data?.token) {
      throw new Error(envelope.message ?? "Failed to start user session");
    }
    return envelope.data;
  } catch (error) {
    logger.error("Failed to start user session:", error);
    const { message, errors } = handleServerError(error);
    throw errors ?? message;
  }
};

/** App-load bootstrap: dual-key rules for token + encrypted session blob. */
export const bootstrapUserSession = async (
  stageId: string,
): Promise<string> => {
  await hydrateSessionTokenFromStorage();
  const hasTokenKey =
    typeof window !== "undefined" &&
    localStorage.getItem(STORAGE_KEYS.TOKEN) !== null;
  const session = await readPersistedSession();
  const hasSession = session !== null;

  if (hasTokenKey && hasSession) {
    if (isTokenExpirationReached(session.tokenExpirationTime)) {
      Storage.clearAllStorageTypes();
      clearAllAuthStorage();
      return resetUserSession(stageId);
    }
    await writeSessionToken(session.token);
    return session.token;
  }

  if (hasTokenKey && !hasSession) {
    const hydratedToken = await hydrateSessionTokenFromStorage();
    if (hydratedToken) {
      await writePersistedSession({
        token: hydratedToken,
        tokenExpirationTime: null,
      });
      return hydratedToken;
    }
    return resetUserSession(stageId);
  }

  if (!hasTokenKey && hasSession) {
    Storage.clearAllStorageTypes();
    clearAllAuthStorage();
    return resetUserSession(stageId);
  }

  return ensureUserSession(stageId);
};

/** Starts dev-session when no stored token exists after hydrate. */
export const ensureUserSession = async (stageId: string): Promise<string> => {
  await hydrateSessionTokenFromStorage();
  const existing = readSessionToken();
  if (existing) {
    const session = await readPersistedSession();
    if (!session) {
      await writePersistedSession({
        token: existing,
        tokenExpirationTime: null,
      });
    }
    return existing;
  }
  const data = await startUserSession({ stageId });
  await writeSessionToken(data.token);
  await writePersistedSession({
    token: data.token,
    tokenExpirationTime: parseTokenExpirationTime(data.expiresAt),
  });
  return data.token;
};

/** Clears stored auth and always starts a new dev-session. */
export const resetUserSession = async (stageId: string): Promise<string> => {
  clearAllAuthStorage();
  const data = await startUserSession({ stageId });
  await writeSessionToken(data.token);
  await writePersistedSession({
    token: data.token,
    tokenExpirationTime: parseTokenExpirationTime(data.expiresAt),
  });
  return data.token;
};

function parseTokenExpirationTime(
  expiresAt: string | undefined,
): number | null {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

const authService = {
  startUserSession,
  bootstrapUserSession,
  ensureUserSession,
  resetUserSession,
};

export default authService;
