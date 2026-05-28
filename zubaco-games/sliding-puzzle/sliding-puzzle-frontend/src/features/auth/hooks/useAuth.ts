import { useCallback, useEffect, useState } from 'react';

import { setAuthToken, getAuthToken } from '@/services/httpClient';
import { storage } from '@/utils/storage';
import { appConfig } from '@app/config/appConfig';

import { getDevSession } from '../api/authApi';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authenticate: () => Promise<void>;
}

// Deduplicates concurrent auth calls (e.g. React 18 StrictMode double-mount).
// A second call while one is in-flight awaits the same promise instead of firing a new request.
let _pendingAuth: Promise<void> | null = null;

async function getPersistedLiveSessionToken(): Promise<string | null> {
  const persisted = await storage.readLiveSession();
  return persisted?.token || null;
}

/**
 * Auto-authenticates using VITE_STAGE_ID on mount.
 * Stores the JWT in memory (not localStorage).
 */
export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => getAuthToken() !== null);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async () => {
    if (getAuthToken()) {
      setIsAuthenticated(true);
      return;
    }

    const recoveredToken = await getPersistedLiveSessionToken();
    if (recoveredToken) {
      setAuthToken(recoveredToken);
      setIsAuthenticated(true);
      setError(null);
      return;
    }

    if (_pendingAuth) {
      await _pendingAuth;
      setIsAuthenticated(getAuthToken() !== null);
      return;
    }

    setIsLoading(true);
    setError(null);

    _pendingAuth = (async () => {
      try {
        const { token } = await getDevSession(appConfig.game.stageId);
        setAuthToken((await getPersistedLiveSessionToken()) ?? token);
        setIsAuthenticated(true);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setIsAuthenticated(false);
        setError(message);
      } finally {
        setIsLoading(false);
        _pendingAuth = null;
      }
    })();

    await _pendingAuth;
  }, []);

  useEffect(() => {
    void authenticate();
  }, [authenticate]);

  return {
    isAuthenticated,
    isLoading,
    error,
    authenticate,
  };
}
