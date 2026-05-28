export const gameKeys = {
  all: ['game'] as const,

  config: (stageId: string) => [...gameKeys.all, 'config', stageId] as const,

  session: (sessionId: string) => [...gameKeys.all, 'session', sessionId] as const,

  nextSequence: (sessionId: string, roundNumber: number) =>
    [...gameKeys.session(sessionId), 'next-sequence', roundNumber] as const,

  timeSync: (sessionId: string) => [...gameKeys.session(sessionId), 'time-sync'] as const,
};
