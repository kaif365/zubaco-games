import { useState, useCallback } from 'react';
import httpClient from '@/services/httpClient';
import type { GameSessionResponse, SubmitResponse, WordAnswer } from '@/types/game';

export function useGameSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGame = useCallback(async (stageId: string): Promise<GameSessionResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await httpClient.post<{ data: GameSessionResponse }>('/game/start', { stageId });
      setLoading(false);
      return data.data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start');
      setLoading(false);
      return null;
    }
  }, []);

  const submitResult = useCallback(async (
    gameSessionId: string,
    answers: WordAnswer[],
    clientScore: number,
  ): Promise<SubmitResponse | null> => {
    try {
      const { data } = await httpClient.post<{ data: SubmitResponse }>('/game/submit', {
        gameSessionId, answers, clientScore,
      });
      return data.data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
      return null;
    }
  }, []);

  return { loading, error, startGame, submitResult };
}
