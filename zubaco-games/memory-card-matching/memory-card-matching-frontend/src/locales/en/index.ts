import type { StageInstructionContent } from '@micro-screens/src';

const memoryMatchInstructions: StageInstructionContent & {
  playNowButton: string;
  learnHowToPlay: string;
} = {
  gameLabel: 'GAME {stage}',
  statusLabel: 'ACTIVE',
  gameTitle: 'Memory Match',
  playNowButton: 'Play Now',
  learnHowToPlay: 'Learn How To Play?',
  slides: [
    {
      id: 'description',
      title: 'Game Description',
      description:
        'Memory Match is a card-flipping game that sharpens your concentration and recall. A grid of face-down cards is briefly revealed — study the pairs, then flip them back and match every pair from memory before the timer runs out.',
      items: [
        {
          id: 'observe',
          title: 'Observe',
          description: 'Study all cards while they are face-up.',
          variant: 'step',
        },
        {
          id: 'memorize',
          title: 'Memorize',
          description: 'Lock the positions of each pair in your mind.',
          variant: 'step',
        },
        {
          id: 'match',
          title: 'Match',
          description: 'Flip two cards at a time to find their pair.',
          variant: 'step',
        },
        {
          id: 'score',
          title: 'Score',
          description: 'Clear all pairs before time runs out to win.',
          variant: 'step',
        },
      ],
    },
    {
      id: 'scoring',
      title: 'Scoring Rules',
      description: 'Understand how your performance is evaluated.',
      items: [
        {
          id: 'match',
          title: 'Matched Pair',
          description: 'Earn points for every correct pair you flip.',
          variant: 'step',
        },
        {
          id: 'speed',
          title: 'Speed Bonus',
          description: 'Finish faster to claim extra time-based points.',
          variant: 'step',
        },
        {
          id: 'mismatch',
          title: 'Mismatch',
          description: 'Cards flip back — no points lost, keep going.',
          variant: 'step',
        },
        {
          id: 'levels',
          title: 'Multiple Levels',
          description: 'Each cleared level adds to your total score.',
          variant: 'step',
        },
        {
          id: 'harder',
          title: 'Larger Grids',
          description: 'Bigger boards carry greater point rewards.',
          variant: 'step',
        },
      ],
    },
    {
      id: 'anti-cheat',
      title: 'Anti-Cheat Rules',
      description:
        'We take fairness seriously. The following actions will result in automatic disqualification:',
      items: [
        {
          id: 'switch',
          title: 'Switching apps or minimizing the browser during the game',
          description: '',
          variant: 'rule',
        },
        {
          id: 'patterns',
          title: 'Suspicious click patterns (too fast or automated)',
          description: '',
          variant: 'rule',
        },
        {
          id: 'tools',
          title: 'Using external tools or assistance',
          description: '',
          variant: 'rule',
        },
        {
          id: 'accounts',
          title: 'Multiple attempts with different accounts',
          description: '',
          variant: 'rule',
        },
        {
          id: 'early',
          title: 'Do not flip cards before the preview ends.',
          description: '',
          variant: 'rule',
        },
      ],
    },
  ],
};

export const en = {
  translation: {
    auth: {
      fetchingDevUserTitle: 'Signing you in',
      fetchingDevUserCopy: 'Setting up your session…',
      fetchingConfigTitle: 'Loading game settings',
      fetchingConfigCopy: 'Fetching configuration for this stage…',
      failedTitle: 'Could not start the game',
    },
    errors: {
      connectionFailed: 'Connection failed',
      startFailed: 'Failed to start game',
      requestFailed: 'Request failed',
      offline: 'You are offline',
      contentFailed: 'Content unavailable',
      contentNotFound: 'Instruction content is not set up for this stage yet.',
    },
    app: {
      authLoading: 'Fetching dummy user token...',
      authFailed: 'Failed to authenticate: {error}',
      configLoading: 'Loading game configuration...',
      configError: 'Could not load game configuration. Please try again.',
      retry: 'RETRY',
      tiltTitle: 'Tilt detected!',
      tiltDescription: 'Switch to portrait mode to keep playing',
      startTitle: 'Memory Match',
      startTagline: 'Find all matching pairs',
      startDescription: 'Clear all levels before the timer runs out to win.',
      startPlay: 'Play',
    },
    offline: {
      connectionLost: 'Connection Lost',
      youAreOffline: 'You are offline',
      message: 'Internet is required to continue. Please check your network and retry.',
      retry: 'Retry',
    },
    demo: {
      badge: 'Demo',
      skip: 'DONE',
      memorize: 'MEMORIZE',
      complete: 'DEMO COMPLETE',
      progress: 'DEMO {level} / {total} · {matched} / {pairs}',
      demoCleared: 'Demo Cleared',
    },
    game: {
      memorize: 'MEMORIZE',
      levelComplete: 'LEVEL COMPLETE',
      levelProgress: 'LEVEL {level} / {total} · {matched} / {pairs}',
      preparing: 'Preparing your game…',
      loadError: 'Could not load game data. Please try again.',
      missingLevelData: 'Game session payload is missing level data.',
      initFailed: 'Failed to initialize game.',
      nextLevel: 'Next Level',
      roundTransition: {
        nextRound: 'Next Round',
      },
    },
    instructions: {
      stages: {
        1: memoryMatchInstructions,
        2: memoryMatchInstructions,
        3: memoryMatchInstructions,
        4: memoryMatchInstructions,
      },
    },
    results: {
      success: {
        scoreLabel: 'YOUR SCORE',
        chipLabel: 'You’re Doing Awesome',
        headingLeading: 'Well done! You’ve cleared the',
        headingHighlight: ' Memory Match!',
        headingTrailing: '',
        subheading: 'Great recall — keep it up for the upcoming games.',
        progressLabel: 'Progress',
        progressSuffixLabel: 'Games completed',
        ctaLabel: 'Continue',
      },
      failure: {
        scoreLabel: 'YOUR SCORE',
        chipLabel: 'You gave it a try!',
        headingLeading: 'Don’t worry, try again in the',
        headingHighlight: ' next game!',
        headingTrailing: '',
        subheading: 'Keep practicing your memory — you’ll get there!',
        progressLabel: 'Progress',
        progressSuffixLabel: 'Games completed',
        ctaLabel: 'Continue',
      },
    },
  },
} as const;
