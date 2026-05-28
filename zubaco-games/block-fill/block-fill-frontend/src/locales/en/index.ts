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
      scoreFailed: 'Score loading failed',
      contentFailed: 'Content unavailable',
      contentNotFound: 'Instruction content is not set up for this stage yet.',
    },
    meta: {
      title: 'Block Fill',
      label: 'Premium Puzzle Game',
    },
    game: {
      demo: 'Demo',
      done: 'Done',
      demoCleared: 'Demo Cleared',
      level: 'Level',
      round: 'Round',
      demoMessages: {
        title: 'How to Play',
        primaryInstruction: 'Connect all matching dots.',
        secondaryInstruction: 'Fill 100% of the board to finish the round.',
        tip: 'Tip: Avoid crossing paths and cover empty cells as you go.',
      },
      demoToActualTransition: {
        title: 'Scored rounds starting',
        body: 'Your session timer counts from here — finishing this round adds to your score.',
      },
      roundAdvance: {
        loader: 'Loading next round…',
      },
      finalRound: {
        loader: 'Calculating score…',
      },
      pauseDialog: {
        tag: 'Paused',
        title: 'Take a breath',
        description:
          'Resume your current route, restart the board, or head back to level select.',
        resume: 'Resume',
        restart: 'Restart Level',
        exit: 'Exit to Levels',
      },
      winDialog: {
        tag: 'Board Cleared',
        score: 'Score',
        time: 'Time',
        target: 'Target',
        scoreNote:
          'Score is calculated as `timeLimit - timeTaken`, with a floor of zero to keep future backend leaderboard rules deterministic.',
        replay: 'Replay',
        nextLevel: 'Next Level',
        finishPack: 'Finish Pack',
        levelSelect: 'Level Select',
      },
    },
    tilt: {
      title: 'Tilt detected!',
      message: 'Switch to portrait mode to keep playing',
    },
    offline: {
      connectionLost: 'Connection Lost',
      youAreOffline: 'You are offline',
      message: 'Internet is required to continue. Please check your network and retry.',
      retry: 'Retry',
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
          gameTitle: 'Block Fill',
          slides: [
            {
              id: 'description',
              title: 'How The Game Works',
              description:
                'Connect matching colored dots with a continuous path and fill every cell on the grid. Complete as many puzzles as you can before time runs out.',
              items: [
                {
                  id: 'connect',
                  title: 'Connect',
                  description: 'Draw a path between two dots of the same colour.',
                  variant: 'step',
                },
                {
                  id: 'fill',
                  title: 'Fill',
                  description: 'Every cell on the grid must be covered to solve the puzzle.',
                  variant: 'step',
                },
                {
                  id: 'no-cross',
                  title: 'No Crossing',
                  description: 'Paths cannot cross or overlap each other.',
                  variant: 'step',
                },
                {
                  id: 'advance',
                  title: 'Advance',
                  description: 'Solve the puzzle to move to the next one.',
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
                  id: 'puzzle-complete',
                  title: 'Puzzle Complete',
                  description: 'Solving a puzzle earns points based on grid size and speed.',
                  variant: 'step',
                },
                {
                  id: 'full-fill',
                  title: 'Full Fill Bonus',
                  description: 'Filling all cells without any empty space gives a bonus.',
                  variant: 'step',
                },
                {
                  id: 'time-limit',
                  title: 'Time Limit',
                  description: 'Solve as many puzzles as possible before the timer ends.',
                  variant: 'step',
                },
                {
                  id: 'final-score',
                  title: 'Final Score',
                  description: 'Final score is the total from all completed puzzles.',
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
                  title: 'Suspicious interaction patterns (too fast or automated)',
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
              ],
            },
          ],
        },
        '2': {
          gameLabel: 'GAME {stage}',
          statusLabel: 'ACTIVE',
          gameTitle: 'Block Fill',
          slides: [
            {
              id: 'description',
              title: 'How The Game Works',
              description:
                'Connect matching colored dots with a continuous path and fill every cell on the grid. Complete as many puzzles as you can before time runs out.',
              items: [
                {
                  id: 'connect',
                  title: 'Connect',
                  description: 'Draw a path between two dots of the same colour.',
                  variant: 'step',
                },
                {
                  id: 'fill',
                  title: 'Fill',
                  description: 'Every cell on the grid must be covered to solve the puzzle.',
                  variant: 'step',
                },
                {
                  id: 'no-cross',
                  title: 'No Crossing',
                  description: 'Paths cannot cross or overlap each other.',
                  variant: 'step',
                },
                {
                  id: 'advance',
                  title: 'Advance',
                  description: 'Solve the puzzle to move to the next one.',
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
                  id: 'puzzle-complete',
                  title: 'Puzzle Complete',
                  description: 'Solving a puzzle earns points based on grid size and speed.',
                  variant: 'step',
                },
                {
                  id: 'full-fill',
                  title: 'Full Fill Bonus',
                  description: 'Filling all cells without any empty space gives a bonus.',
                  variant: 'step',
                },
                {
                  id: 'time-limit',
                  title: 'Time Limit',
                  description: 'Solve as many puzzles as possible before the timer ends.',
                  variant: 'step',
                },
                {
                  id: 'final-score',
                  title: 'Final Score',
                  description: 'Final score is the total from all completed puzzles.',
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
                  title: 'Suspicious interaction patterns (too fast or automated)',
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
              ],
            },
          ],
        },
        '3': {
          gameLabel: 'GAME {stage}',
          statusLabel: 'ACTIVE',
          gameTitle: 'Block Fill',
          slides: [
            {
              id: 'description',
              title: 'How The Game Works',
              description:
                'Connect matching colored dots with a continuous path and fill every cell on the grid. Complete as many puzzles as you can before time runs out.',
              items: [
                {
                  id: 'connect',
                  title: 'Connect',
                  description: 'Draw a path between two dots of the same colour.',
                  variant: 'step',
                },
                {
                  id: 'fill',
                  title: 'Fill',
                  description: 'Every cell on the grid must be covered to solve the puzzle.',
                  variant: 'step',
                },
                {
                  id: 'no-cross',
                  title: 'No Crossing',
                  description: 'Paths cannot cross or overlap each other.',
                  variant: 'step',
                },
                {
                  id: 'advance',
                  title: 'Advance',
                  description: 'Solve the puzzle to move to the next one.',
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
                  id: 'puzzle-complete',
                  title: 'Puzzle Complete',
                  description: 'Solving a puzzle earns points based on grid size and speed.',
                  variant: 'step',
                },
                {
                  id: 'full-fill',
                  title: 'Full Fill Bonus',
                  description: 'Filling all cells without any empty space gives a bonus.',
                  variant: 'step',
                },
                {
                  id: 'time-limit',
                  title: 'Time Limit',
                  description: 'Solve as many puzzles as possible before the timer ends.',
                  variant: 'step',
                },
                {
                  id: 'final-score',
                  title: 'Final Score',
                  description: 'Final score is the total from all completed puzzles.',
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
                  title: 'Suspicious interaction patterns (too fast or automated)',
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
              ],
            },
          ],
        },
        '4': {
          gameLabel: 'GAME {stage}',
          statusLabel: 'ACTIVE',
          gameTitle: 'Block Fill',
          slides: [
            {
              id: 'description',
              title: 'How The Game Works',
              description:
                'Connect matching colored dots with a continuous path and fill every cell on the grid. Complete as many puzzles as you can before time runs out.',
              items: [
                {
                  id: 'connect',
                  title: 'Connect',
                  description: 'Draw a path between two dots of the same colour.',
                  variant: 'step',
                },
                {
                  id: 'fill',
                  title: 'Fill',
                  description: 'Every cell on the grid must be covered to solve the puzzle.',
                  variant: 'step',
                },
                {
                  id: 'no-cross',
                  title: 'No Crossing',
                  description: 'Paths cannot cross or overlap each other.',
                  variant: 'step',
                },
                {
                  id: 'advance',
                  title: 'Advance',
                  description: 'Solve the puzzle to move to the next one.',
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
                  id: 'puzzle-complete',
                  title: 'Puzzle Complete',
                  description: 'Solving a puzzle earns points based on grid size and speed.',
                  variant: 'step',
                },
                {
                  id: 'full-fill',
                  title: 'Full Fill Bonus',
                  description: 'Filling all cells without any empty space gives a bonus.',
                  variant: 'step',
                },
                {
                  id: 'time-limit',
                  title: 'Time Limit',
                  description: 'Solve as many puzzles as possible before the timer ends.',
                  variant: 'step',
                },
                {
                  id: 'final-score',
                  title: 'Final Score',
                  description: 'Final score is the total from all completed puzzles.',
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
                  title: 'Suspicious interaction patterns (too fast or automated)',
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
              ],
            },
          ],
        },
      },
    },
    results: {
      success: {
        scoreLabel: 'YOUR SCORE',
        chipLabel: 'Puzzle Master!',
        headingLeading: "Well done! You've solved the",
        headingHighlight: ' Flow Puzzle!',
        headingTrailing: '',
        subheading: 'Great pathfinding — keep it up for the upcoming games.',
        progressLabel: 'Progress',
        progressSuffixLabel: 'Puzzles completed',
        ctaLabel: 'Continue',
      },
      failure: {
        scoreLabel: 'YOUR SCORE',
        chipLabel: 'Nice effort!',
        headingLeading: "Don't worry, try again in the",
        headingHighlight: ' next game!',
        headingTrailing: '',
        subheading: "Keep practising your flow — you'll crack it next time!",
        progressLabel: 'Progress',
        progressSuffixLabel: 'Puzzles completed',
        ctaLabel: 'Continue',
      },
    },
  },
} as const;
