export interface Circle { id: number; x: number; y: number; color: 'green' | 'red' | 'blue' | 'yellow'; spawnedAt: number; }
export interface Tap { circleId: number; timestamp: number; correct: boolean; }
export interface GameConfig { timeLimitMs: number; initialSpawnIntervalMs: number; speedIncreaseEveryMs: number; speedMultiplier: number; maxWrongTaps: number; }
export interface StartGameResponse { gameSessionId: string; seed: number; config: GameConfig; serverTime: string; }
export interface SubmitResponse { finalScore: number; status: string; correctTaps: number; }
