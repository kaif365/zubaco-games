import {
  encryptPayload,
  decryptPayload,
  isEncryptedPayload,
} from "@/utils/crypto";
import { ENCRYPTION_KEY, IS_ENCRYPTION_ENABLED } from "@/constants/api";

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const parsed = JSON.parse(item) as unknown;
      if (isEncryptedPayload(parsed)) {
        return (await decryptPayload(parsed, ENCRYPTION_KEY)) as T;
      }
      // plain-text fallback for data written before encryption was enabled
      return parsed as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      if (!IS_ENCRYPTION_ENABLED) {
        localStorage.setItem(key, JSON.stringify(value));
        return;
      }

      const encrypted = await encryptPayload(value as unknown, ENCRYPTION_KEY);
      localStorage.setItem(key, JSON.stringify(encrypted));
    } catch {
      console.warn(`[storage] Failed to set key "${key}"`);
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    localStorage.clear();
  },
};
