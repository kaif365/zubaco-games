import { defaultGameConfig } from '@/config/gameConfig';
import type { GameConfig, PlayerSession, TutorialStep } from '@/types/game';

// Values here mirror the admin panel defaults (ZUBACO-admin → Sequence Recall config).
// When the backend is wired up, GameConfigProvider will fetch these from the admin API instead.
export const mockGameConfig: GameConfig = {
  ...defaultGameConfig,
  boxCount: 4,
  turnLimit: 0,
  timerSeconds: 0,
  baseScorePerSound: 10,
  sessionTimerSeconds: 60, // whole-session countdown; swap for backend-provided sessionEndTime later
  initialSequenceLength: 1, // sequences start at length 2; valid range 1–6
};

export const mockTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Sequence Recall',
    description: 'Watch each glowing tile, then replay the exact same order.',
    target: 'board',
  },
  {
    id: 'hud',
    title: 'Use the HUD',
    description: 'Track score, lives, and streak. Mistakes reduce a life.',
    target: 'hud',
  },
  {
    id: 'controls',
    title: 'Use mouse or keyboard',
    description: 'Press 1-4 keys or click tiles. Keep your streak alive.',
    target: 'controls',
  },
];

export const mockPlayerSession: PlayerSession = {
  playerId: 'mock-player-001',
  nickname: 'Arcade Rookie',
  bestScore: 0,
  gamesPlayed: 0,
};
