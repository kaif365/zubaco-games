import { useCallback, useEffect, useState } from "react";

import { clearAuthStorage } from "@/lib/auth";
import { ensureDevSessionToken } from "@/services/api/auth";
import { useSettingsStore } from "@/store/settings";
import { appConfig } from "@app/config/appConfig";

let sessionPromise: Promise<void> | null = null;
const resetListeners = new Set<() => void>();

function ensureSession(stageId: string): Promise<void> {
  sessionPromise ??= ensureDevSessionToken(stageId)
    .then(() => undefined)
    .catch((error: unknown) => {
      sessionPromise = null;
      throw error;
    });

  return sessionPromise;
}

function resetSession(): void {
  sessionPromise = null;
  clearAuthStorage();
}

/** App-load auth: hydrate encrypted token or fetch dev-session when missing. */
export function useDevAuth() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onReset = () => {
      setIsReady(false);
      setError(null);
    };
    resetListeners.add(onReset);
    return () => {
      resetListeners.delete(onReset);
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      return;
    }

    void (async () => {
      try {
        const stageId = appConfig.stage.id;
        await ensureSession(stageId);
        setIsReady(true);
      } catch (error) {
        resetSession();
        setError(
          error instanceof Error ? error.message : "Failed to start session",
        );
      }
    })();
  }, [isReady]);

  return { isReady, error };
}

/**
 * Clears stored token and re-runs auth bootstrap (dev-session on next cycle).
 * Use after Continue / Done / Start Fresh — not on routine 401 (axios handles that).
 */
export function useRequestDevAuthRefresh() {
  const { beginBootstrap } = useSettingsStore();

  return useCallback(() => {
    resetSession();
    beginBootstrap();
    for (const listener of resetListeners) {
      listener();
    }
  }, [beginBootstrap]);
}
