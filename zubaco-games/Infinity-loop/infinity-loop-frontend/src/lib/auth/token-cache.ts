import { STORAGE_KEYS } from "@/constants/storage";
import { encryptedStorage } from "@/utils/encrypted-storage";
import Storage, { StorageTypes } from "@/utils/storage";

let tokenCache: string | null = null;

export function readSessionToken(): string | null {
  return tokenCache;
}

export async function hydrateSessionTokenFromStorage(): Promise<string | null> {
  const fromEncrypted = await encryptedStorage.get<string>(STORAGE_KEYS.TOKEN);
  if (typeof fromEncrypted === "string" && fromEncrypted.trim().length > 0) {
    tokenCache = fromEncrypted.trim();
    return tokenCache;
  }

  const legacyRaw = Storage.getStorageData(
    StorageTypes.LOCAL,
    STORAGE_KEYS.TOKEN,
  );
  if (typeof legacyRaw === "string" && legacyRaw.trim().length > 0) {
    const trimmed = legacyRaw.trim();
    tokenCache = trimmed;
    Storage.remove(StorageTypes.LOCAL, STORAGE_KEYS.TOKEN);
    await encryptedStorage.set(STORAGE_KEYS.TOKEN, trimmed);
    return tokenCache;
  }

  tokenCache = null;
  return null;
}

export async function writeSessionToken(token: string): Promise<void> {
  const trimmed = token.trim();
  tokenCache = trimmed;
  await encryptedStorage.set(STORAGE_KEYS.TOKEN, trimmed);
}

export function clearTokenCache(): void {
  tokenCache = null;
}

export function clearSessionTokenStorage(): void {
  clearTokenCache();
  encryptedStorage.remove(STORAGE_KEYS.TOKEN);
  Storage.remove(StorageTypes.LOCAL, STORAGE_KEYS.TOKEN);
}
