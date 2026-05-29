export interface MockSocketEvent {
  type: 'GAME_STARTED' | 'ROUND_COMPLETED' | 'GAME_OVER'
  payload: Record<string, number | string>
}

export const mockSocketEvents: MockSocketEvent[] = [
  { type: 'GAME_STARTED', payload: { timestamp: Date.now() } },
  { type: 'ROUND_COMPLETED', payload: { round: 1 } },
  { type: 'GAME_OVER', payload: { reason: 'lives_exhausted' } },
]
