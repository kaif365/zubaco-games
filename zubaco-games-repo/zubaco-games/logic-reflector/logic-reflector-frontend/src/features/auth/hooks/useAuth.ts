import { useCallback, useEffect, useState } from 'react';
import { getAuthToken, setAuthToken } from '@/services/httpClient';
import { storage } from '@/utils/storage';
import { appConfig } from '@/app/config/appConfig';
import { getDevSession } from '../api/authApi';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authenticate: () => Promise<void>;
}

// Deduplicates concurrent auth calls (React 18 StrictMode double-mount)
let _pendingAuth: Promise<void> | null = null;

async function getPersistedToken(): Promise<string | null> {
  const session = await storage.readLiveSession();
  return session?.token ?? null;
}

export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => getAuthToken() !== null);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async () => {
    if (getAuthToken()) { setIsAuthenticated(true); return; }

    const recovered = await getPersistedToken();
    if (recovered) { setAuthToken(recovered); setIsAuthenticated(true); return; }

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
        setAuthToken((await getPersistedToken()) ?? token);
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
        _pendingAuth = null;
      }
    })();

    await _pendingAuth;
  }, []);

  useEffect(() => { void authenticate(); }, [authenticate]);

  return { isAuthenticated, isLoading, error, authenticate };
}
