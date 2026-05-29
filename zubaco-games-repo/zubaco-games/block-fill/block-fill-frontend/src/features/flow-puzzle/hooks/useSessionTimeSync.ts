import { useEffect, useLayoutEffect, useRef } from 'react';
import { fetchTimeSync } from '@/app/api/gameApi';

interface UseSessionTimeSyncParams {
  sessionId: string | undefined;
  /** Set false for demo rounds — polling only runs on actual rounds. */
  enabled: boolean;
  pollIntervalMs: number;
  onSync: (remainingSeconds: number) => void;
}

/**
 * Polls the time-sync endpoint at `pollIntervalMs` and calls `onSync` with the
 * server-authoritative remaining seconds. Only active when `enabled` is true.
 *
 * @param params Hook parameters
 */
export function useSessionTimeSync({
  sessionId,
  enabled,
  pollIntervalMs,
  onSync,
}: UseSessionTimeSyncParams) {
  const onSyncRef = useRef(onSync);
  useLayoutEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const poll = () => {
      fetchTimeSync(sessionId)
        .then((data) => {
          const remaining = Math.max(
            0,
            Math.round(
              (new Date(data.endTime).getTime() - new Date(data.serverNow).getTime()) / 1000,
            ),
          );
          onSyncRef.current(remaining);
        })
        .catch(() => {});
    };

    poll();
    const id = window.setInterval(poll, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [sessionId, enabled, pollIntervalMs]);
}
