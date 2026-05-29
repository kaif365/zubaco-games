import { clearLegacyUrlSearchParams } from "@/utils/clear-legacy-url-search-params";

export {
  registerUnauthorizedRecovery,
  runUnauthorizedRecovery,
} from "./session-recovery";

export {
  clearPersistedSession,
  hasPersistedSession,
  hasStoredTokenKey,
  isTokenExpirationReached,
  persistSessionFromGameMeta,
  readPersistedSession,
  writePersistedSession,
} from "./session-storage";

export {
  clearSessionTokenStorage,
  clearTokenCache,
  hydrateSessionTokenFromStorage,
  readSessionToken,
  writeSessionToken,
} from "./token-cache";

import { clearPersistedSession } from "./session-storage";
import { clearSessionTokenStorage } from "./token-cache";

/** Removes session token storage and strips legacy auth query params. */
export function clearSessionToken(): void {
  clearSessionTokenStorage();
  clearPersistedSession();
  clearLegacyUrlSearchParams();
}

export function clearAllAuthStorage(): void {
  clearSessionTokenStorage();
  clearPersistedSession();
  clearLegacyUrlSearchParams();
}
