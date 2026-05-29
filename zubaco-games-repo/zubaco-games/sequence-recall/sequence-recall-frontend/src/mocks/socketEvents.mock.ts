export interface MockSocketEvent {
  type: 'GAME_STARTED' | 'ROUND_COMPLETED' | 'GAME_OVER';
  payload: Record<string, number | string>;
}

export const mockSocketEvents: MockSocketEvent[] = [
  {
    type: 'GAME_STARTED',
    payload: {
      timestamp: Date.now(),
      stageId: '5cdfb5fb-9db5-42ef-8f1e-64b42abf24d1',
    },
  },
  { type: 'ROUND_COMPLETED', payload: { round: 1 } },
  { type: 'GAME_OVER', payload: { reason: 'lives_exhausted' } },
];
