import { useEffect, useLayoutEffect, useRef } from 'react';
import { gameApi } from '@/api/gameApi';

const DEFAULT_INTERVAL_MS = 5000;

export function useTimeSync(
  sessionId: string | null,
  isActive: boolean,
  onSync: (timeRemaining: number) => void,
  intervalMs = DEFAULT_INTERVAL_MS,
) {
  const onSyncRef = useRef(onSync);
  useLayoutEffect(() => { onSyncRef.current = onSync; });

  useEffect(() => {
    if (!isActive || !sessionId) return;

    const poll = async () => {
      try {
        const data = await gameApi.timeSync(sessionId);
        const timeRemaining = Math.max(
          0,
          Math.round((new Date(data.endTime).getTime() - new Date(data.serverNow).getTime()) / 1000),
        );
        onSyncRef.current(timeRemaining);
      } catch {
        // ignore transient failures — client timer continues independently
      }
    };

    const id = setInterval(() => void poll(), intervalMs);
    return () => clearInterval(id);
  }, [sessionId, isActive, intervalMs]);
}
