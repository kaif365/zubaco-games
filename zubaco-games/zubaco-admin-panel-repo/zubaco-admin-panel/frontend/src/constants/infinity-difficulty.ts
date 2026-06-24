export const INFINITY_DIFFICULTY_OPTIONS = ["EASY", "MEDIUM", "HARD"] as const;

export type InfinityDifficulty = (typeof INFINITY_DIFFICULTY_OPTIONS)[number];
