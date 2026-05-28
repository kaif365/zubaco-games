import { useState, useCallback } from 'react';
import httpClient from '@/services/httpClient';
import type { GameSessionResponse, SubmitResponse, SortAnswer } from '@/types/game';

export function useGameSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGame = useCallback(async (stageId: string): Promise<GameSessionResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await httpClient.post<{ data: GameSessionResponse }>('/game/start', { stageId });
      setSessionId(data.data.gameSessionId);
      setLoading(false);
      return data.data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
      setLoading(false);
      return null;
    }
  }, []);

  const submitResult = useCallback(async (
    gameSessionId: string,
    answers: SortAnswer[],
    clientScore: number,
  ): Promise<SubmitResponse | null> => {
    try {
      const { data } = await httpClient.post<{ data: SubmitResponse }>('/game/submit', {
        gameSessionId,
        answers,
        clientScore,
      });
      return data.data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
      return null;
    }
  }, []);

  const endGame = useCallback(async (gameSessionId: string, reason: string) => {
    try { await httpClient.post('/game/game-over', { gameSessionId, reason }); } catch {}
  }, []);

  return { sessionId, loading, error, startGame, submitResult, endGame };
}
