import { ENCRYPTION_KEY, IS_ENCRYPTION_ENABLED } from "@/constants/api";
import {
  decryptPayload,
  encryptPayload,
  isEncryptedPayload,
} from "@/utils/crypto";

export const encryptedStorage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const parsed = JSON.parse(item) as unknown;
      if (isEncryptedPayload(parsed)) {
        if (!ENCRYPTION_KEY) return null;
        return (await decryptPayload(parsed, ENCRYPTION_KEY)) as T;
      }
      return parsed as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      if (!IS_ENCRYPTION_ENABLED || !ENCRYPTION_KEY) {
        localStorage.setItem(key, JSON.stringify(value));
        return;
      }

      const encrypted = await encryptPayload(value, ENCRYPTION_KEY);
      localStorage.setItem(key, JSON.stringify(encrypted));
    } catch {
      // Storage write failed — caller may retry on next action.
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },
};
