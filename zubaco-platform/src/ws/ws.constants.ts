export const WS_HEARTBEAT_INTERVAL_MS = 5000;
export const WS_HEARTBEAT_TIMEOUT_MS = 5000;
export const WS_RECONNECTION_GRACE_TTL_SECONDS = 30;

export const REDIS_KEY_GRACE_PREFIX = 'ws:grace:';
export const REDIS_KEY_GRACE_EXPIRATIONS = 'ws:grace:expirations';
export const REDIS_KEY_USER_SESSION_PREFIX = 'ws:session:';
export const REDIS_KEY_MATCH_PREFIX = 'ws:match:';
export const REDIS_CHANNEL_TOURNAMENT_EVENTS = 'ws:channel:tournament:events';

export type SessionConnectionStatus =
  | 'CONNECTED'
  | 'DISCONNECTED_TRANSIENT'
  | 'FORFEITED'
  | 'RESUMED';

export interface MatchGraceSnapshot {
  matchId: string;
  userId: string;
  tournamentId: string;
  stageNumber: number;
  level: number;
  currentScore: number;
  lastSeq: number;
  disconnectedAt: number;
  expiresAt: number;
  status: SessionConnectionStatus;
  metadata?: Record<string, unknown>;
}

export interface ForfeitedMatchResult {
  matchId: string;
  userId: string;
  tournamentId: string;
  stageNumber: number;
  finalScore: number;
  status: 'FORFEITED';
  forfeitedAt: string;
}

export interface ResumeSessionResult {
  resumed: boolean;
  snapshot: MatchGraceSnapshot | null;
  reason?: string;
}
