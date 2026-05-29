import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { ENCRYPTION_KEY } = vi.hoisted(() => ({
  ENCRYPTION_KEY:
    "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
}));

vi.mock("@/constants/api", () => ({
  ENCRYPTION_KEY,
  IS_ENCRYPTION_ENABLED: false,
}));

import { STORAGE_KEYS } from "@/constants/storage";
import { encryptedStorage } from "@/utils/encrypted-storage";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
});

describe("encryptedStorage", () => {
  beforeEach(() => {
    store.clear();
  });

  afterEach(() => {
    store.clear();
  });

  it("stores token AES-GCM wrapped when encryption key is configured", async () => {
    await encryptedStorage.set(STORAGE_KEYS.TOKEN, "test-jwt-token");

    const raw = localStorage.getItem(STORAGE_KEYS.TOKEN);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as {
      iv?: string;
      ciphertext?: string;
      tag?: string;
    };
    expect(parsed).toMatchObject({
      iv: expect.any(String),
      ciphertext: expect.any(String),
      tag: expect.any(String),
    });
    expect(parsed).not.toHaveProperty("encrypted");

    const read = await encryptedStorage.get<string>(STORAGE_KEYS.TOKEN);
    expect(read).toBe("test-jwt-token");
  });
});
