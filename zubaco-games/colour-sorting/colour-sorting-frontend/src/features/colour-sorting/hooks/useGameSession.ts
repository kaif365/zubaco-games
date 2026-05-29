import { useState, useCallback } from 'react';
import httpClient from '@/services/httpClient';
import type { GameSessionResponse, SubmitResponse, GameMove, StageConfig } from '@/types/game';

function getOfflineConfig(level: number): StageConfig {
  const colorCount = Math.min(3 + Math.floor((level - 1) / 3), 9);
  const ballsPerTube = 4;
  const emptyTubes = 2;
  return {
    tubeCount: colorCount + emptyTubes,
    colorCount,
    ballsPerTube,
    emptyTubes,
    timeLimitMs: 120000 + (level * 10000),
    pointsPerSortedTube: 100,
    timeBonusMultiplier: 1.5,
  };
}

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
      // Offline fallback: generate config locally
      const lvl = level || 1;
      const offlineSession: GameSessionResponse = {
        gameSessionId: `offline-${Date.now()}`,
        endTime: new Date(Date.now() + 120000 + lvl * 10000).toISOString(),
        serverTime: new Date().toISOString(),
        config: getOfflineConfig(lvl),
        seed: Date.now() + lvl,
      };
      setSessionId(offlineSession.gameSessionId);
      setLoading(false);
      return offlineSession;
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
