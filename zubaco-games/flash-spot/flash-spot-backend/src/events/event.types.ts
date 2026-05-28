export enum GameEventType {
  GAME_COMPLETED = 'GAME_COMPLETED',
  CHEAT_FLAGGED = 'CHEAT_FLAGGED',
  SCORE_ANOMALY = 'SCORE_ANOMALY',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
}

export interface GameEvent {
  type: GameEventType;
  gameId: string;
  sessionId: string;
  userId: string;
  stageId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface EventPublisher {
  publish(event: GameEvent): Promise<void>;
}
