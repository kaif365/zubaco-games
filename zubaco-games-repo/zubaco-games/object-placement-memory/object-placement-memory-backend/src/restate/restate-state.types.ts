export interface InFlightSession {
  sessionId: string;
  userId: string;
  stageId: string;
  status: 'active' | 'result_processing' | 'completed' | 'expired';
  expiryAtMs: number;
  startedAtMs: number;
  finalSeed: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export const STATE_KEY_SESSION = 'session';
