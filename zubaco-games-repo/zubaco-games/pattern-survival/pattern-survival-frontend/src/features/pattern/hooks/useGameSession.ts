import { useState, useCallback } from 'react';
import httpClient from '../../../services/httpClient';
import type { StartGameResponse, SubmitResponse } from '../../../types/game';

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

  const submitGame = useCallback(async (roundsReached: number, perfectRounds: number, clientScore: number, roundTimings?: number[][]): Promise<SubmitResponse> => {
    if (!sessionId) throw new Error('No session');
    const payload: { gameSessionId: string; roundsReached: number; perfectRounds: number; clientScore: number; roundTimings?: number[][] } = { gameSessionId: sessionId, roundsReached, perfectRounds, clientScore };
    if (roundTimings && roundTimings.length > 0) payload.roundTimings = roundTimings;
    const { data } = await httpClient.post<{ data: SubmitResponse }>('/game/submit', payload);
    return data.data;
  }, [sessionId]);

  return { startGame, submitGame, sessionId, loading };
}
