export const en = {
  translation: {
    meta: {
      title: 'Sequence Recall',
    },
    game: {
      demo: 'Demo',
      level: 'Level',
      levelComplete: 'LEVEL COMPLETE',
      done: 'Done',
      demoCleared: 'Demo Cleared',
      errorTitle: 'Sequence Recall',
      errorMessage: 'Unable to initialize game. Please refresh.',
      errorRefresh: 'Refresh',
      boardInstruction: {
        playback: 'Watch the sequence carefully.',
        input: 'Tap to repeat the sequence',
      },
      roundTransition: {
        gameEnd: 'GAME OVER',
        nextLevel: 'NEXT LEVEL',
        gameOver: 'GAME OVER',
      },
      feedback: {
        startWhenReady: 'Start the game when ready.',
        getReady: 'Get ready…',
        watchPattern: 'Watch the pattern ({length} taps).',
        yourTurn: 'Your turn. Repeat the sequence.',
        keepGoing: 'Keep going.',
        niceKeepGoing: 'Nice. Keep going.',
        correct: 'Correct!',
        wrongTryAgain: 'Wrong sequence! Try again.',
        watchCarefully: 'Watch the sequence carefully.',
        watchSequence: 'Watch the sequence!',
        sessionResumed: 'Session resumed — watch the sequence!',
        sessionComplete: 'Session complete!',
        sessionCompleteLevel: 'Session complete! You reached level {level}.',
        timeUp: "Time's up!",
        gameOver: 'Game over!',
        maxSequence: 'Max sequence reached. Keep the high-score streak alive.',
        timeUpEnded: "Time's up! Session ended.",
        correctNext: 'Correct! Next sequence is longer.',
      },
      roundFeedback: {
        watch: 'Watch',
        turn: 'Turn',
        sequenceFlow: 'Sequence Flow',
        cleared: 'Cleared',
      },
      endGameDialog: {
        title: 'End current game?',
        description:
          'Your current run will end and the board will reset. Use this if you want to stop now and start over.',
        confirm: 'End Game',
        confirming: 'Ending…',
      },
      practiceDialog: {
        title: 'Practice Complete!',
        description:
          'Nice work. You finished the practice sequences. Go back to the lobby or jump straight into the real game.',
        cancel: 'Back To Lobby',
        confirm: 'Start Game',
        confirming: 'Starting…',
      },
      toast: {
        offline: 'No internet connection. Please reconnect and retry.',
        somethingWrong: 'Something went wrong. Please try again.',
      },
    },
    hud: {
      score: 'Score',
      combo: 'Combo',
      lives: 'Lives',
    },
    tutorial: {
      howToPlay: 'How To Play',
      tileDemo: 'Tile Demo',
      instruction: 'Instruction',
      skip: 'Skip',
      next: 'Next',
      startGame: 'Start Game',
      steps: {
        welcome: {
          title: 'Welcome to Sequence Recall',
          description: 'Watch each glowing tile, then replay the exact same order.',
        },
        hud: {
          title: 'Use the HUD',
          description: 'Track score, lives, and streak. Mistakes reduce a life.',
        },
        controls: {
          title: 'Use mouse or keyboard',
          description: 'Press 1-4 keys or click tiles. Keep your streak alive.',
        },
      },
    },
    offline: {
      connectionLost: 'Connection Lost',
      youAreOffline: 'You are offline',
      message: 'Internet is required to continue. Please check your network and retry.',
      retry: 'Retry',
    },
    dialog: {
      confirmation: 'Confirmation',
      cancel: 'Cancel',
    },
    errors: {
      connectionFailed: 'Connection failed',
      startFailed: 'Failed to start game',
      requestFailed: 'Request failed',
      offline: 'You are offline',
      contentFailed: 'Content unavailable',
      contentNotFound: 'Instruction content is not set up for this stage yet.',
    },
    auth: {
      failed: 'Failed to authenticate',
      failedTitle: 'Failed to authenticate',
      devFetching: 'Fetching a dummy user (dev-session)…',
      devNote:
        'Stand-in auth while this build runs standalone. This screen goes away when the game is launched from the main app with a real session.',
      fetchingDevUserTitle: 'Fetching a dummy user (dev-session)...',
      fetchingDevUserCopy:
        'Stand-in auth while this build runs standalone. This screen goes away when the game is launched from the main app with a real session.',
      fetchingConfigTitle: 'Loading game configuration...',
      fetchingConfigCopy: 'Fetching stage settings from the server.',
      fetchingSoundsTitle: 'Loading game sounds...',
      fetchingSoundsCopy: 'Preparing audio for gameplay.',
    },
    instructions: {
      labels: {
        playNow: 'Play Now',
        learnHowToPlay: 'Learn How To Play?',
        starting: 'Starting...',
      },
      stages: {
        '1': {
          gameLabel: 'GAME {stage}',
          statusLabel: 'ACTIVE',
          gameTitle: 'Sequence Recall',
          slides: [
            {
              id: 'description',
              title: 'How The Game Works',
              description:
                'Watch the tile sequence carefully, then repeat the same order by tapping the tiles. Sequence length increases as you progress.',
              items: [
                {
                  id: 'observe',
                  title: 'Watch',
                  description: 'Focus on the exact order of highlighted tiles.',
                  variant: 'step',
                },
                {
                  id: 'memorize',
                  title: 'Memorize',
                  description: 'Remember both position and order, not just tiles.',
                  variant: 'step',
                },
                {
                  id: 'repeat',
                  title: 'Repeat',
                  description: 'Tap the tiles in the same sequence shown.',
                  variant: 'step',
                },
                {
                  id: 'score',
                  title: 'Progress',
                  description: 'Correct rounds move you to longer sequences.',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'scoring',
              title: 'Scoring Rules',
              description: 'Know how points and results are calculated.',
              items: [
                {
                  id: 'correct-tap',
                  title: 'Correct Tap',
                  description: 'Each correct tap adds score.',
                  variant: 'step',
                },
                {
                  id: 'round-complete',
                  title: 'Round Complete',
                  description: 'Complete a full sequence to advance.',
                  variant: 'step',
                },
                {
                  id: 'wrong-move',
                  title: 'Wrong Move',
                  description: 'Wrong input follows stage rules (retry, previous, next, or end).',
                  variant: 'step',
                },
                {
                  id: 'time-limit',
                  title: 'Time Limit',
                  description: 'Finish as many rounds as possible before timer ends.',
                  variant: 'step',
                },
                {
                  id: 'final-score',
                  title: 'Final Score',
                  description: 'Final score includes completed rounds and bonus rules.',
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
                  title: 'Switching apps or minimizing the browser during gameplay',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'patterns',
                  title: 'Suspicious tapping patterns (too fast or automated)',
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
                  title: 'Do not tap tiles before playback is complete.',
                  description: '',
                  variant: 'rule',
                },
              ],
            },
          ],
        },
        '2': {
          gameLabel: 'GAME {stage}',
          statusLabel: 'ACTIVE',
          gameTitle: 'Sequence Recall',
          slides: [
            {
              id: 'description',
              title: 'How The Game Works',
              description:
                'Watch the tile sequence carefully, then repeat the same order by tapping the tiles. Sequence length increases as you progress.',
              items: [
                {
                  id: 'observe',
                  title: 'Watch',
                  description: 'Focus on the exact order of highlighted tiles.',
                  variant: 'step',
                },
                {
                  id: 'memorize',
                  title: 'Memorize',
                  description: 'Remember both position and order, not just tiles.',
                  variant: 'step',
                },
                {
                  id: 'repeat',
                  title: 'Repeat',
                  description: 'Tap the tiles in the same sequence shown.',
                  variant: 'step',
                },
                {
                  id: 'score',
                  title: 'Progress',
                  description: 'Correct rounds move you to longer sequences.',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'scoring',
              title: 'Scoring Rules',
              description: 'Know how points and results are calculated.',
              items: [
                {
                  id: 'correct-tap',
                  title: 'Correct Tap',
                  description: 'Each correct tap adds score.',
                  variant: 'step',
                },
                {
                  id: 'round-complete',
                  title: 'Round Complete',
                  description: 'Complete a full sequence to advance.',
                  variant: 'step',
                },
                {
                  id: 'wrong-move',
                  title: 'Wrong Move',
                  description: 'Wrong input follows stage rules (retry, previous, next, or end).',
                  variant: 'step',
                },
                {
                  id: 'time-limit',
                  title: 'Time Limit',
                  description: 'Finish as many rounds as possible before timer ends.',
                  variant: 'step',
                },
                {
                  id: 'final-score',
                  title: 'Final Score',
                  description: 'Final score includes completed rounds and bonus rules.',
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
                  title: 'Switching apps or minimizing the browser during gameplay',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'patterns',
                  title: 'Suspicious tapping patterns (too fast or automated)',
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
                  title: 'Do not tap tiles before playback is complete.',
                  description: '',
                  variant: 'rule',
                },
              ],
            },
          ],
        },
        '3': {
          gameLabel: 'GAME {stage}',
          statusLabel: 'ACTIVE',
          gameTitle: 'Sequence Recall',
          slides: [
            {
              id: 'description',
              title: 'How The Game Works',
              description:
                'Watch the tile sequence carefully, then repeat the same order by tapping the tiles. Sequence length increases as you progress.',
              items: [
                {
                  id: 'observe',
                  title: 'Watch',
                  description: 'Focus on the exact order of highlighted tiles.',
                  variant: 'step',
                },
                {
                  id: 'memorize',
                  title: 'Memorize',
                  description: 'Remember both position and order, not just tiles.',
                  variant: 'step',
                },
                {
                  id: 'repeat',
                  title: 'Repeat',
                  description: 'Tap the tiles in the same sequence shown.',
                  variant: 'step',
                },
                {
                  id: 'score',
                  title: 'Progress',
                  description: 'Correct rounds move you to longer sequences.',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'scoring',
              title: 'Scoring Rules',
              description: 'Know how points and results are calculated.',
              items: [
                {
                  id: 'correct-tap',
                  title: 'Correct Tap',
                  description: 'Each correct tap adds score.',
                  variant: 'step',
                },
                {
                  id: 'round-complete',
                  title: 'Round Complete',
                  description: 'Complete a full sequence to advance.',
                  variant: 'step',
                },
                {
                  id: 'wrong-move',
                  title: 'Wrong Move',
                  description: 'Wrong input follows stage rules (retry, previous, next, or end).',
                  variant: 'step',
                },
                {
                  id: 'time-limit',
                  title: 'Time Limit',
                  description: 'Finish as many rounds as possible before timer ends.',
                  variant: 'step',
                },
                {
                  id: 'final-score',
                  title: 'Final Score',
                  description: 'Final score includes completed rounds and bonus rules.',
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
                  title: 'Switching apps or minimizing the browser during gameplay',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'patterns',
                  title: 'Suspicious tapping patterns (too fast or automated)',
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
                  title: 'Do not tap tiles before playback is complete.',
                  description: '',
                  variant: 'rule',
                },
              ],
            },
          ],
        },
        '4': {
          gameLabel: 'GAME {stage}',
          statusLabel: 'ACTIVE',
          gameTitle: 'Sequence Recall',
          slides: [
            {
              id: 'description',
              title: 'How The Game Works',
              description:
                'Watch the tile sequence carefully, then repeat the same order by tapping the tiles. Sequence length increases as you progress.',
              items: [
                {
                  id: 'observe',
                  title: 'Watch',
                  description: 'Focus on the exact order of highlighted tiles.',
                  variant: 'step',
                },
                {
                  id: 'memorize',
                  title: 'Memorize',
                  description: 'Remember both position and order, not just tiles.',
                  variant: 'step',
                },
                {
                  id: 'repeat',
                  title: 'Repeat',
                  description: 'Tap the tiles in the same sequence shown.',
                  variant: 'step',
                },
                {
                  id: 'score',
                  title: 'Progress',
                  description: 'Correct rounds move you to longer sequences.',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'scoring',
              title: 'Scoring Rules',
              description: 'Know how points and results are calculated.',
              items: [
                {
                  id: 'correct-tap',
                  title: 'Correct Tap',
                  description: 'Each correct tap adds score.',
                  variant: 'step',
                },
                {
                  id: 'round-complete',
                  title: 'Round Complete',
                  description: 'Complete a full sequence to advance.',
                  variant: 'step',
                },
                {
                  id: 'wrong-move',
                  title: 'Wrong Move',
                  description: 'Wrong input follows stage rules (retry, previous, next, or end).',
                  variant: 'step',
                },
                {
                  id: 'time-limit',
                  title: 'Time Limit',
                  description: 'Finish as many rounds as possible before timer ends.',
                  variant: 'step',
                },
                {
                  id: 'final-score',
                  title: 'Final Score',
                  description: 'Final score includes completed rounds and bonus rules.',
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
                  title: 'Switching apps or minimizing the browser during gameplay',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'patterns',
                  title: 'Suspicious tapping patterns (too fast or automated)',
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
                  title: 'Do not tap tiles before playback is complete.',
                  description: '',
                  variant: 'rule',
                },
              ],
            },
          ],
        },
      },
    },
    results: {
      success: {
        scoreLabel: 'YOUR SCORE',
        chipLabel: "You're Doing Awesome",
        headingLeading: "Well done! You've cleared the",
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
        headingLeading: "Don't worry, try again in the",
        headingHighlight: ' next game!',
        headingTrailing: '',
        subheading: "Keep practicing your memory — you'll get there!",
        progressLabel: 'Progress',
        progressSuffixLabel: 'Games completed',
        ctaLabel: 'Continue',
      },
    },
  },
} as const;
