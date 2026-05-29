export type CellColor = 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'orange';
export interface GameConfig { gridSize: number; colors: CellColor[]; timeLimitMs: number; flashDurationMs: number; pointsPerRound: number; perfectBonus: number; }
export interface StartGameResponse { gameSessionId: string; seed: number; config: GameConfig; serverTime: string; }
export interface SubmitResponse { finalScore: number; status: string; roundsReached: number; }
