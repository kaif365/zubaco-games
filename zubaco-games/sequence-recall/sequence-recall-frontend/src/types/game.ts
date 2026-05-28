export type TileId = number; // valid range is 1..boxCount (set by GameConfig)

export const BOARD_MODE = {
  PLAYBACK: 'playback',
  INPUT: 'input',
  IDLE: 'idle',
} as const;

export type BoardMode = (typeof BOARD_MODE)[keyof typeof BOARD_MODE];

export interface DifficultyConfig {
  maxSequenceLength: number;
  playbackMs: number;
  gapMs: number;
  inputTimeoutMs: number;
  pointsPerStep: number;
  levelSize: number;
}

export interface RewardConfig {
  perfectRoundBonus: number;
  streakMultiplier: number;
}

export interface PlaybackConfig {
  tileFlashMs: number;
  tileGapMs: number;
  speedMultiplier: number;
  inputGlowMs: number;
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: 'hud' | 'board' | 'controls';
}

export interface GameConfig {
  initialLives: number;
  colors: Record<number, string>;
  difficultyByLevel: Record<number, DifficultyConfig>;
  playback: PlaybackConfig;
  reward: RewardConfig;
  tutorialEnabledByDefault: boolean;
  // Admin-configurable fields
  boxCount: number; // number of tiles shown (2–6)
  turnLimit: number; // max rounds per session; 0 = unlimited
  timerSeconds: number; // legacy per-turn countdown (unused when sessionTimerSeconds > 0)
  baseScorePerSound: number; // score at level N = N × baseScorePerSound
  // Timer-survival mode config
  sessionTimerSeconds: number; // whole-session countdown; 0 = no timer. Replace with backend-provided sessionEndTime (ms epoch) when wiring API.
  initialSequenceLength: number; // sequence length at round 1 (e.g. 2, 3, 4); increments +1 each success
  wrongMoveHandling?: number;
}

export interface PlayerSession {
  playerId: string;
  nickname: string;
  bestScore: number;
  gamesPlayed: number;
}

export const GAME_PHASE = {
  LOADING: 'loading',
  READY: 'ready',
  TUTORIAL: 'tutorial',
  SHOWING_SEQUENCE: 'showing-sequence',
  AWAITING_INPUT: 'awaiting-input',
  ROUND_SUCCESS: 'round-success',
  ROUND_FAILURE: 'round-failure',
  GAME_OVER: 'game-over',
  SESSION_COMPLETE: 'session-complete',
} as const;

export type GamePhase = (typeof GAME_PHASE)[keyof typeof GAME_PHASE];

export interface GameStats {
  score: number;
  level: number;
  round: number;
  lives: number;
  streak: number;
  highScore: number;
}

export interface GameState extends GameStats {
  phase: GamePhase;
  sequence: TileId[];
  revealedSequence: TileId[];
  playerInput: TileId[];
  activeTile: TileId | null;
  feedback: string;
  won: boolean;
}

export interface SubmitMoveRequest {
  tileId: TileId;
}

export interface SubmitMoveResponse {
  isCorrect: boolean;
  completedRound: boolean;
  wonGame: boolean;
  state: GameState;
}
