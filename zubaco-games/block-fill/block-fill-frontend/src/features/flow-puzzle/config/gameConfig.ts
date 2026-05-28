export const FLOW_DIFFICULTY_CONFIG = {
  easy: {
    packId: 'difficulty-easy',
    label: 'Easy',
    themeName: 'Starter boards with clear routing rhythm.',
  },
  medium: {
    packId: 'difficulty-medium',
    label: 'Medium',
    themeName: 'Wider boards that demand longer route planning.',
  },
  hard: {
    packId: 'difficulty-hard',
    label: 'Hard',
    themeName: 'Large boards built for deep coverage management.',
  },
} as const;

export type FlowDifficultyKey = keyof typeof FLOW_DIFFICULTY_CONFIG;

export const DEFAULT_FLOW_PACK_ID = FLOW_DIFFICULTY_CONFIG.easy.packId;
