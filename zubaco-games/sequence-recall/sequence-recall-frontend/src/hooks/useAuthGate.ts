import { useEffect, useRef, useState } from 'react';

import { useAudioContextValue } from '@/audio/AudioProvider';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { gameConfigQueryOptions } from '@/features/sequence-recall/api/gameConfig.query';
import { storage } from '@/utils/storage';
import { appConfig } from '@app/config/appConfig';
import { queryClient } from '@app/providers/QueryProvider';
import { fetchDevSession } from '@services/authService';

const GAME_AUDIO_SCENE = 'sequence-recall';

const TOKEN_KEY = STORAGE_KEYS.AUTH_TOKEN;
const EXPIRES_KEY = STORAGE_KEYS.AUTH_EXPIRES_AT;
const ACTIVE_GAME_SESSION_KEY = STORAGE_KEYS.ACTIVE_GAME_SESSION;
const AUTH_RECOVERY_FLAG = 'ZUBACO-auth-recovery-attempted';

export type AuthGateLoadingPhase = 'dev-session' | 'config' | 'audio';

let sessionPromise: Promise<void> | null = null;

function getOrFetchSession(stageId: string): Promise<void> {
  if (!sessionPromise) {
    sessionPromise = fetchDevSession(stageId)
      .then(async (data) => {
        await Promise.all([
          storage.setSecure(TOKEN_KEY, data.token),
          storage.setSecure(EXPIRES_KEY, data.expiresAt),
        ]);
      })
      .catch((err: unknown) => {
        sessionPromise = null;
        throw err;
      });
  }
  return sessionPromise;
}

async function hasStoredDevSession(): Promise<boolean> {
  const [token, persistedSession] = await Promise.all([
    storage.getSecure<string>(TOKEN_KEY),
    storage.getSecure<unknown>(ACTIVE_GAME_SESSION_KEY),
  ]);
  return Boolean(token && persistedSession);
}

async function ensureDevSession(): Promise<void> {
  if (await hasStoredDevSession()) {
    return;
  }
  await getOrFetchSession(appConfig.socket.stageId);
}

async function prefetchGameConfig(): Promise<void> {
  await queryClient.ensureQueryData(gameConfigQueryOptions(appConfig.socket.stageId));
}

const AUDIO_READY_TIMEOUT_MS = 2_000;
const AUDIO_PRELOAD_TIMEOUT_MS = 3_000;

function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAudioReady(isReady: () => boolean): Promise<void> {
  if (isReady()) return;
  await Promise.race([
    new Promise<void>((resolve) => {
      const intervalId = window.setInterval(() => {
        if (isReady()) {
          window.clearInterval(intervalId);
          resolve();
        }
      }, 16);
    }),
    timeout(AUDIO_READY_TIMEOUT_MS),
  ]);
}

async function prefetchGameAudio(
  getAudio: () => ReturnType<typeof useAudioContextValue>,
): Promise<void> {
  const audio = getAudio();
  await waitForAudioReady(() => audio.ready);
  await Promise.race([
    audio.preloadScene(GAME_AUDIO_SCENE),
    timeout(AUDIO_PRELOAD_TIMEOUT_MS),
  ]);
}

export function useAuthGate() {
  const audio = useAudioContextValue();
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<AuthGateLoadingPhase>('config');

  useEffect(() => {
    if (isReady) return;

    void (async () => {
      try {
        const skipDevSession = await hasStoredDevSession();
        if (!skipDevSession) {
          setPhase('dev-session');
          await ensureDevSession();
        }

        setPhase('config');
        await prefetchGameConfig();

        setPhase('audio');
        await prefetchGameAudio(() => audioRef.current);

        sessionStorage.removeItem(AUTH_RECOVERY_FLAG);
        setIsReady(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    })();
  }, [isReady]);

  return { isReady, error, phase };
}
