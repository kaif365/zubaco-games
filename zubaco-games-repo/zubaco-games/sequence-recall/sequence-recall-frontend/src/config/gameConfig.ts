import type { GameConfig } from '@/types/game';

export const defaultGameConfig: GameConfig = {
  initialLives: 1,
  colors: {
    1: 'bg-emerald-400',
    2: 'bg-rose-500',
    3: 'bg-blue-500',
    4: 'bg-yellow-300',
    5: 'bg-purple-500',
    6: 'bg-orange-400',
  },
  difficultyByLevel: {
    1: {
      maxSequenceLength: 50,
      playbackMs: 500,
      gapMs: 150,
      inputTimeoutMs: 5500,
      pointsPerStep: 10,
      levelSize: 9999,
    },
  },
  playback: {
    tileFlashMs: 300,
    tileGapMs: 100,
    speedMultiplier: 1.15,
    inputGlowMs: 100,
  },
  reward: { perfectRoundBonus: 0, streakMultiplier: 1 },
  tutorialEnabledByDefault: true,
  // Admin-configurable defaults
  boxCount: 4,
  turnLimit: 0,
  timerSeconds: 0,
  baseScorePerSound: 10,
  // Timer-survival mode defaults
  sessionTimerSeconds: 60, // 60-second session; backend will provide sessionEndTime in future
  initialSequenceLength: 2, // sequences start at length 2
};
