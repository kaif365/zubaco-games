export const WRONG_MOVE_HANDLING = {
  /** FE calls game-over immediately */
  GAME_END: 1,
  /** FE replays the current sequence */
  PLAY_AGAIN: 2,
  /** FE calls prev-sequence */
  PREV_SEQUENCE: 3,
  /** FE calls next-sequence (default) */
  NEXT_SEQUENCE: 4,
} as const;

export type WrongMoveHandlingValue =
  (typeof WRONG_MOVE_HANDLING)[keyof typeof WRONG_MOVE_HANDLING];

export const WRONG_MOVE_HANDLING_SELECT_OPTIONS: {
  value: string;
  label: string;
  description: string;
}[] = [
  {
    value: "1",
    label: "Game end",
    description: "End the game immediately on a wrong move",
  },
  {
    value: "2",
    label: "Play again",
    description: "Replay the current sequence",
  },
  {
    value: "3",
    label: "Previous sequence",
    description: "Go to the previous sequence",
  },
  {
    value: "4",
    label: "Next sequence",
    description: "Advance to the next sequence (default)",
  },
];
