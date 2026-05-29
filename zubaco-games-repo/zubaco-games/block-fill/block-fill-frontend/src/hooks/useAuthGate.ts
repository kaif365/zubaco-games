import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { gameConfigQueryOptions } from '@/app/api/gameConfig.query';
import { ensureDevSession } from '@/app/api/authApi';
import { getStoredAuthSession, isAuthSessionValid } from '@/app/authSession';
import { appEnv } from '@/app/config/env';

export type AuthGateLoadingPhase = 'dev-session' | 'config';

function hasValidAuthSession(): boolean {
  const session = getStoredAuthSession();
  return Boolean(session && isAuthSessionValid(session));
}

export function useAuthGate() {
  const queryClient = useQueryClient();
  const stageId = appEnv.userStageId ?? '';
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<AuthGateLoadingPhase>('dev-session');

  useEffect(() => {
    if (isReady) return;

    void (async () => {
      try {
        if (!stageId) {
          // No stage configured — skip auth (local dev without backend)
          setIsReady(true);
          return;
        }

        if (!hasValidAuthSession()) {
          setPhase('dev-session');
        }
        await ensureDevSession();

        setPhase('config');
        await queryClient.ensureQueryData(gameConfigQueryOptions(stageId));

        setIsReady(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    })();
  }, [isReady, queryClient, stageId]);

  return { isReady, error, phase };
}
