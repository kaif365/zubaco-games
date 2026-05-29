import { ENCRYPTION_KEY, IS_ENCRYPTION_ENABLED } from "@/constants/api";
import { logger } from "@/lib/default-logger";
import {
  decryptPayload,
  encryptPayload,
  isEncryptedPayload,
} from "@/utils/crypto";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Legacy `{ encrypted, payload, version }` wrapper — migrate on read. */
function unwrapLegacyStoredPayload(parsed: unknown): unknown {
  if (
    isRecord(parsed) &&
    parsed.encrypted === true &&
    parsed.version === 1 &&
    "payload" in parsed
  ) {
    return parsed.payload;
  }
  return parsed;
}

function shouldEncryptAtRest(): boolean {
  return Boolean(ENCRYPTION_KEY && ENCRYPTION_KEY.length === 64);
}

function shouldEncryptValue(): boolean {
  return (
    shouldEncryptAtRest() || (IS_ENCRYPTION_ENABLED && Boolean(ENCRYPTION_KEY))
  );
}

export const encryptedStorage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      if (!item) {
        return null;
      }
      const parsed = unwrapLegacyStoredPayload(JSON.parse(item) as unknown);

      if (isEncryptedPayload(parsed)) {
        if (!ENCRYPTION_KEY) {
          return null;
        }
        return (await decryptPayload(parsed, ENCRYPTION_KEY)) as T;
      }

      return parsed as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      if (shouldEncryptValue()) {
        const encrypted = await encryptPayload(value, ENCRYPTION_KEY);
        localStorage.setItem(key, JSON.stringify(encrypted));
        return;
      }

      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error("encryptedStorage.set failed", { key, error });
      throw error;
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },
};
