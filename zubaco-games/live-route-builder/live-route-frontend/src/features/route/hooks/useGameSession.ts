import { useState, useCallback } from 'react';
import httpClient from '../../../services/httpClient';
import type { StartGameResponse, SubmitResponse, Edge } from '../../../types/game';

export function useGameSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startGame = useCallback(async (stageId: string): Promise<StartGameResponse> => {
    setLoading(true);
    try {
      const { data } = await httpClient.post<{ data: StartGameResponse }>('/game/start', { stageId });
      setSessionId(data.data.gameSessionId);
      return data.data;
    } finally { setLoading(false); }
  }, []);

  const submitGame = useCallback(async (edges: Edge[], clientScore: number): Promise<SubmitResponse> => {
    if (!sessionId) throw new Error('No session');
    const { data } = await httpClient.post<{ data: SubmitResponse }>('/game/submit', { gameSessionId: sessionId, edges, clientScore });
    return data.data;
  }, [sessionId]);

  return { startGame, submitGame, sessionId, loading };
}
