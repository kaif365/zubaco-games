import { useState, useCallback } from 'react';
import httpClient from '@/services/httpClient';
import type { GameSessionResponse, SubmitResponse, PlacementAttempt } from '@/types/game';

interface GameSessionState {
  sessionId: string | null;
  loading: boolean;
  error: string | null;
}

export function useGameSession() {
  const [state, setState] = useState<GameSessionState>({
    sessionId: null,
    loading: false,
    error: null,
  });

  const startGame = useCallback(async (stageId: string): Promise<GameSessionResponse | null> => {
    setState({ sessionId: null, loading: true, error: null });
    try {
      const { data } = await httpClient.post<{ data: GameSessionResponse }>('/game/start', { stageId });
      const session = data.data;
      setState({ sessionId: session.gameSessionId, loading: false, error: null });
      return session;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start game';
      setState({ sessionId: null, loading: false, error: message });
      return null;
    }
  }, []);

  const submitResult = useCallback(
    async (
      gameSessionId: string,
      placements: PlacementAttempt[],
      clientScore: number,
    ): Promise<SubmitResponse | null> => {
      try {
        const { data } = await httpClient.post<{ data: SubmitResponse }>('/game/submit', {
          gameSessionId,
          placements,
          clientScore,
        });
        return data.data;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to submit';
        setState((s) => ({ ...s, error: message }));
        return null;
      }
    },
    [],
  );

  const endGame = useCallback(async (gameSessionId: string, reason: string) => {
    try {
      await httpClient.post('/game/game-over', { gameSessionId, reason });
    } catch {
      // Silent fail on game-over
    }
  }, []);

  return { ...state, startGame, submitResult, endGame };
}
