import { BOARD_MODE, type BoardMode } from '@/types/game';

// Values are i18n key paths — translate at the display point via t(instructionText)
export const BOARD_INSTRUCTION: Partial<Record<BoardMode, string>> = {
  [BOARD_MODE.PLAYBACK]: 'game.boardInstruction.playback',
  [BOARD_MODE.INPUT]: 'game.boardInstruction.input',
};

export const WRONG_MOVE_HANDLING = {
  GAME_END: 1,
  PLAY_AGAIN: 2,
  PREV_SEQUENCE: 3,
  NEXT_SEQUENCE: 4,
} as const;

type WrongMoveHandlingValue = (typeof WRONG_MOVE_HANDLING)[keyof typeof WRONG_MOVE_HANDLING];

export const ROUND_TRANSITION_MESSAGE: Partial<Record<WrongMoveHandlingValue, string>> = {
  [WRONG_MOVE_HANDLING.GAME_END]: 'game.roundTransition.gameEnd',
  [WRONG_MOVE_HANDLING.NEXT_SEQUENCE]: 'game.roundTransition.nextLevel',
};

export const ROUND_LAST_MESSAGE = 'game.roundTransition.gameOver';

export const ROUND_TRANSITION_DELAY_MS = 1000;
export const ROUND_INTIAL_START_DELAY_MS = 500;
