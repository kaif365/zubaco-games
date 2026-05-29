import { useCallback, useRef, useState } from 'react';

import type { GameConfig, GameSession } from '@/types/game';
import { httpClient } from '@services/httpClient';

interface StartGameResponse {
  gameSessionId: string;
  endTime: string | null;
  serverTime: string;
  config: GameConfig;
  seed: number;
  roundNumber: number;
}

export function useGameSession() {
  const [session, setSession] = useState<GameSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<GameSession | null>(null);

  const startGame = useCallback(async (stageId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await httpClient.post<{ data: StartGameResponse }>('/game/start', { stageId });
      const response = data.data;
      const newSession: GameSession = {
        gameSessionId: response.gameSessionId,
        endTime: response.endTime,
        serverTime: response.serverTime,
        config: response.config,
        grid: [],
      };
      setSession(newSession);
      sessionRef.current = newSession;
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start game';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitResult = useCallback(async (
    gameSessionId: string,
    taps: { cellId: number; isCorrect: boolean; timestamp: number }[],
    score: number,
  ) => {
    try {
      const { data } = await httpClient.post('/game/submit', {
        gameSessionId,
        taps,
        clientScore: score,
      });
      return data.data as { finalScore: number; status: string };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit result';
      setError(message);
      throw err;
    }
  }, []);

  const endGame = useCallback(async (gameSessionId: string, reason: string) => {
    try {
      await httpClient.post('/game/game-over', { gameSessionId, reason });
    } catch {
      // Best-effort end signal
    }
  }, []);

  return { session, isLoading, error, startGame, submitResult, endGame };
}
