export const DEMO_ROUND_MESSAGES = {
  title: 'game.demoMessages.title',
  primaryInstruction: 'game.demoMessages.primaryInstruction',
  secondaryInstruction: 'game.demoMessages.secondaryInstruction',
  tip: 'game.demoMessages.tip',
} as const;

/** Shown over the board while fetching the first scored round after the final demo puzzle. */
export const DEMO_TO_ACTUAL_TRANSITION_MESSAGES = {
  title: 'game.demoToActualTransition.title',
  body: 'game.demoToActualTransition.body',
} as const;

/** Show the demo→actual transition overlay for at least this long before calling next-board API. */
export const DEMO_TO_ACTUAL_TRANSITION_PRE_API_MS = 2000;

/** Shown on the puzzle area while complete-board runs and until the next board is loaded. */
export const ROUND_ADVANCE_BOARD_MESSAGES = {
  loader: 'game.roundAdvance.loader',
} as const;

/** Last actual round win: puzzle overlay while submitting the final board and ending the session. */
export const FINAL_ROUND_SCORE_MESSAGES = {
  loader: 'game.finalRound.loader',
} as const;
