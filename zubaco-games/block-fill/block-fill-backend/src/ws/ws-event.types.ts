export enum WsEvent {
  // Server -> Client
  GAME_STARTED = 'game:started',
  SCORE_UPDATED = 'game:score-updated',
  SESSION_COMPLETED = 'game:session-completed',
  SESSION_EXPIRED = 'game:session-expired',
  CHEAT_DETECTED = 'game:cheat-detected',
  LEADERBOARD_UPDATE = 'game:leaderboard-update',

  // Client -> Server
  JOIN_SESSION = 'join-session',
  LEAVE_SESSION = 'leave-session',
  PING = 'ping',
}

export interface WsPayload<T = unknown> {
  event: WsEvent;
  timestamp: string;
  data: T;
}
