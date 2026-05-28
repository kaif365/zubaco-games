export interface Question { id: number; text: string; answer: string; }
export interface Answer { questionId: number; userAnswer: string; timestamp: number; responseTimeMs: number; }
export interface GameConfig { flashDurationMs: number; answerTimeMs: number; totalQuestions: number; pointsPerCorrect: number; speedBonusMax: number; }
export interface StartGameResponse { gameSessionId: string; serverSeed: string; config: GameConfig; serverTime: string; }
export interface SubmitResponse { finalScore: number; status: string; correctAnswers: number; }
