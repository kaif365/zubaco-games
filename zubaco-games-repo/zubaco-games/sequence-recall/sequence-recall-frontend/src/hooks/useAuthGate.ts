import { useEffect, useRef, useState } from 'react';

import { useAudioContextValue } from '@/audio/AudioProvider';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { gameConfigQueryOptions } from '@/features/sequence-recall/api/gameConfig.query';
import { bootstrapAuthFromUrl } from '@/services/sessionBootstrap';
import { storage } from '@/utils/storage';
import { appConfig } from '@app/config/appConfig';
import { queryClient } from '@app/providers/QueryProvider';

const GAME_AUDIO_SCENE = 'sequence-recall';

const TOKEN_KEY = STORAGE_KEYS.AUTH_TOKEN;
const EXPIRES_KEY = STORAGE_KEYS.AUTH_EXPIRES_AT;
const AUTH_RECOVERY_FLAG = 'ZUBACO-auth-recovery-attempted';

export type AuthGateLoadingPhase = 'dev-session' | 'config' | 'audio';

let sessionPromise: Promise<void> | null = null;

// Development-only mock session. The dynamic import keeps the mock-user dev path
// (and VITE_MOCK_USER_URL) out of production bundles entirely.
async function mintDevSession(stageId: string): Promise<void> {
  const { fetchDevSession } = await import('@services/authService');
  const data = await fetchDevSession(stageId);
  await Promise.all([
    storage.setSecure(TOKEN_KEY, data.token),
    storage.setSecure(EXPIRES_KEY, data.expiresAt),
  ]);
}

function getOrMintDevSession(stageId: string): Promise<void> {
  if (!sessionPromise) {
    sessionPromise = mintDevSession(stageId).catch((err: unknown) => {
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}

async function hasStoredToken(): Promise<boolean> {
  const token = await storage.getSecure<string>(TOKEN_KEY);
  return Boolean(token);
}

// Production authentication: the host platform launches the embedded game with a
// JWT in the launch URL. Development builds fall back to a local mock session.
// No automatic dev session is ever created in production.
async function ensureSession(): Promise<void> {
  if (await hasStoredToken()) return;

  if (await bootstrapAuthFromUrl()) return;

  if (import.meta.env.DEV) {
    await getOrMintDevSession(appConfig.socket.stageId);
    return;
  }

  throw new Error('Missing authentication token. Launch the game from the ZUBACO platform.');
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
        const alreadyAuthenticated = await hasStoredToken();
        if (!alreadyAuthenticated) {
          setPhase('dev-session');
          await ensureSession();
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
