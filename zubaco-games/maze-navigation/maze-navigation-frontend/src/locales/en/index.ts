import { instructionStageContent } from './instruction-stages';

const stage = instructionStageContent;

export const en = {
  translation: {
    meta: {
      title: 'Maze Navigation',
      description: 'A flame-guided maze navigation game.',
    },
    auth: {
      failed: 'Could not start session',
    },
    instructions: {
      primaryCtaLabel: 'Play Now',
      secondaryCtaLabel: 'Learn How To Play?',
      stages: {
        '1': stage,
        '2': stage,
        '3': stage,
        '4': stage,
      },
    },
    results: {
      success: {
        scoreLabel: 'YOUR SCORE',
        chipLabel: "You're Doing Awesome",
        headingLeading: "Well done! You've completed the",
        headingHighlight: ' stage',
        headingTrailing: '',
        subheading: 'Keep it up for the upcoming games.',
        progressLabel: 'Progress',
        progressSuffixLabel: 'Games completed',
        ctaLabel: 'Continue',
      },
      failure: {
        scoreLabel: 'YOUR SCORE',
        chipLabel: 'You gave it a try!',
        headingLeading: "Don't worry, try again in the",
        headingHighlight: ' next game!',
        headingTrailing: '',
        subheading: "Keep practicing, you'll get there!",
        progressLabel: 'Progress',
        progressSuffixLabel: 'Games completed',
        ctaLabel: 'Continue',
      },
    },
    hud: {
      done: 'Done',
      settings: 'Settings',
      closeSettings: 'Close settings',
      openSettings: 'Open settings',
      soundEffects: 'Sound Effects',
      soundOn: 'On',
      soundOff: 'Off',
      startFresh: 'Start Fresh',
      testing: 'Testing',
      returnHome: 'Return to home',
      level: 'Level',
      mode: 'Mode',
      demo: 'DEMO',
      time: 'Time',
    },
    controls: {
      hint: 'Use Arrows or WASD or Swipe',
    },
    tutorial: {
      tapToContinue: 'Tap to continue',
    },
    common: {
      loading: 'Loading...',
    },
    loading: {
      game: 'Loading game',
    },
    demo: {
      noLevelsAdded: 'No DEMO levels added',
    },
  },
};
