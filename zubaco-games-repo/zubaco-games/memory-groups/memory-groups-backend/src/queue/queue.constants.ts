export const QUEUE_NAMES = {
  GAME_EVENTS: 'game-events',
  SESSION_CLEANUP: 'session-cleanup',
} as const;

export const JOB_NAMES = {
  SCORE_SUBMITTED: 'score-submitted',
  SESSION_COMPLETED: 'session-completed',
  CHEAT_DETECTED: 'cheat-detected',
  CLEANUP_EXPIRED: 'cleanup-expired-sessions',
} as const;
