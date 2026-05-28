export interface WordGroup { category: string; words: string[]; }
export interface GameConfig { showDurationMs: number; timeLimitMs: number; groupSize: number; totalGroups: number; pointsPerGroup: number; pointsPerPartialWord: number; timeBonusMultiplier: number; }
export interface StartGameResponse { gameSessionId: string; seed: number; config: GameConfig; serverTime: string; words: string[]; }
export interface SubmitResponse { finalScore: number; status: string; correctGroups: number; }
