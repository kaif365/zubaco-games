import { STORAGE_KEYS } from "@/constants/storage";
import { readSessionToken } from "@/lib/auth/token-cache";
import type { GameMetaData } from "@/types/socket";
import { encryptedStorage } from "@/utils/encrypted-storage";

export interface PersistedSession {
  token: string;
  tokenExpirationTime: number | null;
}

export function isTokenExpirationReached(
  tokenExpirationTime: number | null | undefined,
): boolean {
  if (tokenExpirationTime == null) return false;
  return tokenExpirationTime <= Math.floor(Date.now() / 1000);
}

export async function readPersistedSession(): Promise<PersistedSession | null> {
  const session = await encryptedStorage.get<PersistedSession>(
    STORAGE_KEYS.SESSION,
  );
  if (!session || typeof session.token !== "string") {
    return null;
  }
  return {
    token: session.token,
    tokenExpirationTime:
      typeof session.tokenExpirationTime === "number"
        ? session.tokenExpirationTime
        : null,
  };
}

export async function writePersistedSession(
  patch: PersistedSession,
): Promise<void> {
  const existing = await readPersistedSession();
  const next: PersistedSession = {
    token: patch.token,
    tokenExpirationTime:
      patch.tokenExpirationTime ?? existing?.tokenExpirationTime ?? null,
  };
  await encryptedStorage.set(STORAGE_KEYS.SESSION, next);
}

export function clearPersistedSession(): void {
  encryptedStorage.remove(STORAGE_KEYS.SESSION);
}

export async function hasPersistedSession(): Promise<boolean> {
  return (await readPersistedSession()) !== null;
}

export async function hasStoredTokenKey(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEYS.TOKEN) !== null;
}

export async function persistSessionFromGameMeta(
  data: GameMetaData,
): Promise<void> {
  const token = readSessionToken();
  if (!token) {
    return;
  }

  const existing = await readPersistedSession();
  const tokenExpirationTime =
    typeof data.tokenExpirationTime === "number"
      ? data.tokenExpirationTime
      : (existing?.tokenExpirationTime ?? null);

  await writePersistedSession({
    token,
    tokenExpirationTime,
  });
}
