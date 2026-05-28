import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { gameConfigQueryOptions } from '@/api/gameConfig.query';
import { AUTH_TOKEN_KEY, ensureDevSessionAuth } from '@/lib/devSessionAuth';

export type AuthGateLoadingPhase = 'dev-session' | 'config';

function hasStoredToken(): boolean {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}

export function useAuthGate() {
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<AuthGateLoadingPhase>('dev-session');

  useEffect(() => {
    if (isReady) return;

    void (async () => {
      try {
        if (!hasStoredToken()) {
          setPhase('dev-session');
        }
        await ensureDevSessionAuth();

        setPhase('config');
        await queryClient.ensureQueryData(gameConfigQueryOptions());

        setIsReady(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    })();
  }, [isReady, queryClient]);

  return { isReady, error, phase };
}
