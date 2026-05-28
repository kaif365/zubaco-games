import { useState, useCallback } from 'react';
import httpClient from '@/services/httpClient';
import type { GameSessionResponse, SubmitResponse, GameMove } from '@/types/game';

export function useGameSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGame = useCallback(async (stageId: string, level?: number): Promise<GameSessionResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await httpClient.post<{ data: GameSessionResponse }>('/game/start', { stageId, level });
      setSessionId(data.data.gameSessionId);
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
    moves: GameMove[],
    clientScore: number,
    solved: boolean,
  ): Promise<SubmitResponse | null> => {
    try {
      const { data } = await httpClient.post<{ data: SubmitResponse }>('/game/submit', {
        gameSessionId,
        moves,
        clientScore,
        solved,
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
