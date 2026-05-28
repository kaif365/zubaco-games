export const MAZE_AUDIO_EVENT = {
  move: "maze-audio-move",
  pickSide: "maze-audio-pick-side",
  goalReached: "maze-audio-goal-reached",
} as const;

export type MazeAudioEventName =
  (typeof MAZE_AUDIO_EVENT)[keyof typeof MAZE_AUDIO_EVENT];

export function dispatchMazeMoveAudio(): void {
  globalThis.dispatchEvent(new Event(MAZE_AUDIO_EVENT.move));
}

export function dispatchMazePickSideAudio(): void {
  globalThis.dispatchEvent(new Event(MAZE_AUDIO_EVENT.pickSide));
}

export function dispatchMazeGoalReachedAudio(): void {
  globalThis.dispatchEvent(new Event(MAZE_AUDIO_EVENT.goalReached));
}
