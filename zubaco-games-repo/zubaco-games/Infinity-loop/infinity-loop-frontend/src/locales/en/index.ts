export const en = {
  translation: {
    common: {
      closeToast: "Close notification",
      loading: "Loading...",
    },
    meta: {
      title: "Infinity Loop | Cosmic Connection Puzzle",
      description:
        "Relax and interconnect the loop lines in this immersive cosmic puzzle game.",
    },
    header: {
      level: "Level",
      moves: "Moves",
      time: "Time",
      hintAria: "Show hint",
      resetAria: "Reset level",
      settingsAria: "Open settings",
    },
    settings: {
      title: "Settings",
      audioEffects: "Audio Effects",
      audioEffectsAria: "Audio Effects",
      demoFeatureOnly: "Demo feature only",
      demoSessionDescription:
        "Use this only if your session expired or you want a clean demo identity.",
      startFreshDemoSession: "Start New Game",
      about: "About",
    },
    demo: {
      exitButton: "Done",
      badge: "Demo",
      demoCleared: "Demo Cleared",
      sessionStartFailed:
        "Could not start a game session. Check mock user URL and try again.",
      sessionRefreshFailed:
        "Could not refresh the demo session. Try again later.",
    },
    game: {
      brandName: "Infinity Loop",
      brandTagline: "Relaxing loop puzzle",
      startModalTitle: "Welcome to Infinity Loop",
      startModalDescription:
        "Rotate the pieces to connect every line and complete the loop.",
      startModalPrimaryCta: "Start Game",
      timeUnlimitedAria: "Unlimited time",
      startModalFooter: "Tutorial • Audio Effects: {audio}",
      audioOn: "ON",
      audioOff: "OFF",
      hintLevelOne:
        "Hint: Tap the pieces to rotate, and create the infinity symbols.",
      hintLevelTwo:
        "Hint: Keep connecting paths until every loose end is joined.",
      hintAroundCell:
        "Hint: Focus on the highlighted area and try a few rotations.",
      winInlineTitle: "Congratulations!",
      winToastTitle: "Circuit Complete!",
      winToastDescription: "Level {level} cleared in {moves} moves.",
      nextLevel: "Next Level",
      loadingGrid: "Initializing Grid...",
      connectionLost: "Connection lost. Reconnecting",
      sessionExpiredBanner:
        "Session expired. Open Settings and tap “Start New Game” to continue.",
      authFailedToast:
        "Authentication failed. Please start a fresh session from Settings.",
      finishTitleWon: "Congratulations",
      finishTitleLost: "Game Ended",
      finishDescriptionWon: "You resolved the loop in {moves} moves.",
      finishDescriptionTimeUp: "Time ran out for this board.",
      finishPrimaryTimeUp: "Game Ended",
      replayLevel: "Replay Level",
      stageCompleteTitle: "Congratulations",
      stageFailedTitle: "Stage Failed",
      timeUpTitle: "Time's Up",
      timeUpDescription: "The clock ran out before you finished this stage.",
      statTotalScore: "Total Score",
      statScore: "Score",
      statBoards: "Boards",
      statBonus: "Bonus",
      stageCompleteFooter:
        "Your full stage run is complete. Return to dashboard to begin a fresh run.",
      closeGame: "Close Game",
      portraitOnlyTitle: "Rotate your phone",
      portraitOnlyDescription:
        "This game works best in portrait mode. Please hold your device upright to continue.",
    },
    instructions: {
      stages: {
        "1": {
          language: "EN",
          gameLabel: "GAME {stage}",
          statusLabel: "ACTIVE",
          gameTitle: "Infinity Loop",
          playNowButton: "Play Now",
          learnHowToPlay: "Learn How To Play?",
          pages: [
            {
              id: "description",
              title: "Game Description",
              description:
                "Infinity Loop is a spatial puzzle where every path must connect into closed circuits. Tap pieces to rotate them until all line segments meet with no loose ends. In live play you advance through multiple boards within a stage while the timer runs.",
              pointType: "ORDERED",
              points: [
                {
                  id: "observe",
                  title: "Observe",
                  description: "Study the grid for breaks and corners.",
                },
                {
                  id: "rotate",
                  title: "Rotate",
                  description:
                    "Tap a tile to rotate it and change how paths connect.",
                },
                {
                  id: "complete",
                  title: "Close the loop",
                  description:
                    "Keep adjusting until every line forms a continuous closed loop.",
                },
                {
                  id: "progress",
                  title: "Progress",
                  description:
                    "Clear boards to advance; score and board count show your progress.",
                },
              ],
            },
            {
              id: "scoring",
              title: "Scoring Rules",
              description: "Understand how your performance is evaluated.",
              pointType: "ORDERED",
              points: [
                {
                  id: "boards",
                  title: "Boards cleared",
                  description:
                    "Each solved board counts toward your stage progress.",
                },
                {
                  id: "score",
                  title: "Score",
                  description:
                    "Points reflect how efficiently you solve boards.",
                },
                {
                  id: "time",
                  title: "Time",
                  description:
                    "Finish boards faster before the clock hits zero.",
                },
                {
                  id: "mistakes",
                  title: "Mistakes",
                  description: "Wrong rotations cost moves.",
                },
                {
                  id: "stage",
                  title: "Stage outcome",
                  description: "Final result combines boards, score, and time.",
                },
              ],
            },
            {
              id: "how-to-play",
              title: "How to Play",
              description:
                "Quick reference for controls and flow before you start.",
              pointType: "ORDERED",
              points: [
                {
                  id: "tap",
                  title: "Tap to rotate",
                  description: "Each tap turns that tile one step clockwise.",
                },
                {
                  id: "goal",
                  title: "Close every loop",
                  description:
                    "Keep rotating until every path meets with no loose ends.",
                },
                {
                  id: "moves",
                  title: "Moves matter",
                  description:
                    "Rotations use moves; plan before you tap repeatedly.",
                },
                {
                  id: "hints",
                  title: "Hints",
                  description:
                    "Use the hint action when you need help finding a good cell.",
                },
                {
                  id: "settings",
                  title: "Settings & audio",
                  description:
                    "Open the menu to adjust difficulty, sound, or revisit help.",
                },
              ],
            },
            {
              id: "anti-cheat",
              title: "Anti-Cheat Rules",
              description:
                "We take fairness seriously. The following actions will result in automatic disqualification:",
              pointType: "UNORDERED",
              points: [
                {
                  id: "switch",
                  title:
                    "Switching apps or minimizing the browser during the test",
                  description: "",
                },
                {
                  id: "patterns",
                  title: "Suspicious response patterns (too fast or too slow)",
                  description: "",
                },
                {
                  id: "tools",
                  title: "Using external tools or assistance",
                  description: "",
                },
                {
                  id: "accounts",
                  title: "Multiple attempts with different accounts",
                  description: "",
                },
                {
                  id: "automation",
                  title:
                    "Using scripts, bots, or anything that plays the game for you",
                  description: "",
                },
              ],
            },
          ],
        },
        "2": {
          language: "EN",
          gameLabel: "GAME {stage}",
          statusLabel: "ACTIVE",
          gameTitle: "Infinity Loop",
          playNowButton: "Play Now",
          learnHowToPlay: "Learn How To Play?",
          pages: [
            {
              id: "description",
              title: "Game Description",
              description:
                "Infinity Loop is a spatial puzzle where every path must connect into closed circuits. Tap pieces to rotate them until all line segments meet with no loose ends. In live play you advance through multiple boards within a stage while the timer runs.",
              pointType: "ORDERED",
              points: [
                {
                  id: "observe",
                  title: "Observe",
                  description: "Study the grid for breaks and corners.",
                },
                {
                  id: "rotate",
                  title: "Rotate",
                  description:
                    "Tap a tile to rotate it and change how paths connect.",
                },
                {
                  id: "complete",
                  title: "Close the loop",
                  description:
                    "Keep adjusting until every line forms a continuous closed loop.",
                },
                {
                  id: "progress",
                  title: "Progress",
                  description:
                    "Clear boards to advance; score and board count show your progress.",
                },
              ],
            },
            {
              id: "scoring",
              title: "Scoring Rules",
              description: "Understand how your performance is evaluated.",
              pointType: "ORDERED",
              points: [
                {
                  id: "boards",
                  title: "Boards cleared",
                  description:
                    "Each solved board counts toward your stage progress.",
                },
                {
                  id: "score",
                  title: "Score",
                  description:
                    "Points reflect how efficiently you solve boards.",
                },
                {
                  id: "time",
                  title: "Time",
                  description:
                    "Finish boards faster before the clock hits zero.",
                },
                {
                  id: "mistakes",
                  title: "Mistakes",
                  description: "Wrong rotations cost moves.",
                },
                {
                  id: "stage",
                  title: "Stage outcome",
                  description: "Final result combines boards, score, and time.",
                },
              ],
            },
            {
              id: "how-to-play",
              title: "How to Play",
              description:
                "Quick reference for controls and flow before you start.",
              pointType: "ORDERED",
              points: [
                {
                  id: "tap",
                  title: "Tap to rotate",
                  description: "Each tap turns that tile one step clockwise.",
                },
                {
                  id: "goal",
                  title: "Close every loop",
                  description:
                    "Keep rotating until every path meets with no loose ends.",
                },
                {
                  id: "moves",
                  title: "Moves matter",
                  description:
                    "Rotations use moves; plan before you tap repeatedly.",
                },
                {
                  id: "hints",
                  title: "Hints",
                  description:
                    "Use the hint action when you need help finding a good cell.",
                },
                {
                  id: "settings",
                  title: "Settings & audio",
                  description:
                    "Open the menu to adjust difficulty, sound, or revisit help.",
                },
              ],
            },
            {
              id: "anti-cheat",
              title: "Anti-Cheat Rules",
              description:
                "We take fairness seriously. The following actions will result in automatic disqualification:",
              pointType: "UNORDERED",
              points: [
                {
                  id: "switch",
                  title:
                    "Switching apps or minimizing the browser during the test",
                  description: "",
                },
                {
                  id: "patterns",
                  title: "Suspicious response patterns (too fast or too slow)",
                  description: "",
                },
                {
                  id: "tools",
                  title: "Using external tools or assistance",
                  description: "",
                },
                {
                  id: "accounts",
                  title: "Multiple attempts with different accounts",
                  description: "",
                },
                {
                  id: "automation",
                  title:
                    "Using scripts, bots, or anything that plays the game for you",
                  description: "",
                },
              ],
            },
          ],
        },
        "3": {
          language: "EN",
          gameLabel: "GAME {stage}",
          statusLabel: "ACTIVE",
          gameTitle: "Infinity Loop",
          playNowButton: "Play Now",
          learnHowToPlay: "Learn How To Play?",
          pages: [
            {
              id: "description",
              title: "Game Description",
              description:
                "Infinity Loop is a spatial puzzle where every path must connect into closed circuits. Tap pieces to rotate them until all line segments meet with no loose ends. In live play you advance through multiple boards within a stage while the timer runs.",
              pointType: "ORDERED",
              points: [
                {
                  id: "observe",
                  title: "Observe",
                  description: "Study the grid for breaks and corners.",
                },
                {
                  id: "rotate",
                  title: "Rotate",
                  description:
                    "Tap a tile to rotate it and change how paths connect.",
                },
                {
                  id: "complete",
                  title: "Close the loop",
                  description:
                    "Keep adjusting until every line forms a continuous closed loop.",
                },
                {
                  id: "progress",
                  title: "Progress",
                  description:
                    "Clear boards to advance; score and board count show your progress.",
                },
              ],
            },
            {
              id: "scoring",
              title: "Scoring Rules",
              description: "Understand how your performance is evaluated.",
              pointType: "ORDERED",
              points: [
                {
                  id: "boards",
                  title: "Boards cleared",
                  description:
                    "Each solved board counts toward your stage progress.",
                },
                {
                  id: "score",
                  title: "Score",
                  description:
                    "Points reflect how efficiently you solve boards.",
                },
                {
                  id: "time",
                  title: "Time",
                  description:
                    "Finish boards faster before the clock hits zero.",
                },
                {
                  id: "mistakes",
                  title: "Mistakes",
                  description: "Wrong rotations cost moves.",
                },
                {
                  id: "stage",
                  title: "Stage outcome",
                  description: "Final result combines boards, score, and time.",
                },
              ],
            },
            {
              id: "how-to-play",
              title: "How to Play",
              description:
                "Quick reference for controls and flow before you start.",
              pointType: "ORDERED",
              points: [
                {
                  id: "tap",
                  title: "Tap to rotate",
                  description: "Each tap turns that tile one step clockwise.",
                },
                {
                  id: "goal",
                  title: "Close every loop",
                  description:
                    "Keep rotating until every path meets with no loose ends.",
                },
                {
                  id: "moves",
                  title: "Moves matter",
                  description:
                    "Rotations use moves; plan before you tap repeatedly.",
                },
                {
                  id: "hints",
                  title: "Hints",
                  description:
                    "Use the hint action when you need help finding a good cell.",
                },
                {
                  id: "settings",
                  title: "Settings & audio",
                  description:
                    "Open the menu to adjust difficulty, sound, or revisit help.",
                },
              ],
            },
            {
              id: "anti-cheat",
              title: "Anti-Cheat Rules",
              description:
                "We take fairness seriously. The following actions will result in automatic disqualification:",
              pointType: "UNORDERED",
              points: [
                {
                  id: "switch",
                  title:
                    "Switching apps or minimizing the browser during the test",
                  description: "",
                },
                {
                  id: "patterns",
                  title: "Suspicious response patterns (too fast or too slow)",
                  description: "",
                },
                {
                  id: "tools",
                  title: "Using external tools or assistance",
                  description: "",
                },
                {
                  id: "accounts",
                  title: "Multiple attempts with different accounts",
                  description: "",
                },
                {
                  id: "automation",
                  title:
                    "Using scripts, bots, or anything that plays the game for you",
                  description: "",
                },
              ],
            },
          ],
        },
        "4": {
          language: "EN",
          gameLabel: "GAME {stage}",
          statusLabel: "ACTIVE",
          gameTitle: "Infinity Loop",
          playNowButton: "Play Now",
          learnHowToPlay: "Learn How To Play?",
          pages: [
            {
              id: "description",
              title: "Game Description",
              description:
                "Infinity Loop is a spatial puzzle where every path must connect into closed circuits. Tap pieces to rotate them until all line segments meet with no loose ends. In live play you advance through multiple boards within a stage while the timer runs.",
              pointType: "ORDERED",
              points: [
                {
                  id: "observe",
                  title: "Observe",
                  description: "Study the grid for breaks and corners.",
                },
                {
                  id: "rotate",
                  title: "Rotate",
                  description:
                    "Tap a tile to rotate it and change how paths connect.",
                },
                {
                  id: "complete",
                  title: "Close the loop",
                  description:
                    "Keep adjusting until every line forms a continuous closed loop.",
                },
                {
                  id: "progress",
                  title: "Progress",
                  description:
                    "Clear boards to advance; score and board count show your progress.",
                },
              ],
            },
            {
              id: "scoring",
              title: "Scoring Rules",
              description: "Understand how your performance is evaluated.",
              pointType: "ORDERED",
              points: [
                {
                  id: "boards",
                  title: "Boards cleared",
                  description:
                    "Each solved board counts toward your stage progress.",
                },
                {
                  id: "score",
                  title: "Score",
                  description:
                    "Points reflect how efficiently you solve boards.",
                },
                {
                  id: "time",
                  title: "Time",
                  description:
                    "Finish boards faster before the clock hits zero.",
                },
                {
                  id: "mistakes",
                  title: "Mistakes",
                  description: "Wrong rotations cost moves.",
                },
                {
                  id: "stage",
                  title: "Stage outcome",
                  description: "Final result combines boards, score, and time.",
                },
              ],
            },
            {
              id: "how-to-play",
              title: "How to Play",
              description:
                "Quick reference for controls and flow before you start.",
              pointType: "ORDERED",
              points: [
                {
                  id: "tap",
                  title: "Tap to rotate",
                  description: "Each tap turns that tile one step clockwise.",
                },
                {
                  id: "goal",
                  title: "Close every loop",
                  description:
                    "Keep rotating until every path meets with no loose ends.",
                },
                {
                  id: "moves",
                  title: "Moves matter",
                  description:
                    "Rotations use moves; plan before you tap repeatedly.",
                },
                {
                  id: "hints",
                  title: "Hints",
                  description:
                    "Use the hint action when you need help finding a good cell.",
                },
                {
                  id: "settings",
                  title: "Settings & audio",
                  description:
                    "Open the menu to adjust difficulty, sound, or revisit help.",
                },
              ],
            },
            {
              id: "anti-cheat",
              title: "Anti-Cheat Rules",
              description:
                "We take fairness seriously. The following actions will result in automatic disqualification:",
              pointType: "UNORDERED",
              points: [
                {
                  id: "switch",
                  title:
                    "Switching apps or minimizing the browser during the test",
                  description: "",
                },
                {
                  id: "patterns",
                  title: "Suspicious response patterns (too fast or too slow)",
                  description: "",
                },
                {
                  id: "tools",
                  title: "Using external tools or assistance",
                  description: "",
                },
                {
                  id: "accounts",
                  title: "Multiple attempts with different accounts",
                  description: "",
                },
                {
                  id: "automation",
                  title:
                    "Using scripts, bots, or anything that plays the game for you",
                  description: "",
                },
              ],
            },
          ],
        },
      },
    },
    offline: {
      connectionLost: "Connection Lost",
      youAreOffline: "You are offline",
      message: "Internet is required to continue. Please check your network and retry.",
      retry: "Retry",
    },
    results: {
      success: {
        scoreLabel: "YOUR SCORE",
        chipLabel: "You’re Doing Awesome",
        headingLeading: "Well done! You’ve completed the",
        headingHighlight: " stage",
        headingTrailing: "",
        subheading: "Keep it up for the upcoming games.",
        progressLabel: "Progress",
        progressSuffixLabel: "Games completed",
        ctaLabel: "Continue",
      },
      failure: {
        scoreLabel: "YOUR SCORE",
        chipLabel: "You gave it a try!",
        headingLeading: "Don’t worry, try again in the",
        headingHighlight: " next game!",
        headingTrailing: "",
        subheading: "Keep practicing, you’ll get there!",
        progressLabel: "Progress",
        progressSuffixLabel: "Games completed",
        ctaLabel: "Continue",
      },
    },
  },
} as const;
