export { STAGE_THEME_COLORS } from '../theme/colors';
export { INSTRUCTION_CONTENT_CONFIG } from './mocks/config';
export { INSTRUCTION_SCREEN_CONTENT_MAP } from './section/instructions/instruction-screen-content-map';
export { INSTRUCTION_SCREEN_LABELS } from './section/instructions/instruction-screen-labels';
export { GameInstructionsScreen } from './section/instructions/instructions-screen';
export { GameInstructionsSkeleton } from './section/instructions/instructions-skeleton';
export { GameFailureScreen, GameSuccessScreen } from './section/results/game-result-screen';
export {
  FAILURE_RESULT_LABELS,
  SUCCESS_RESULT_LABELS,
} from './section/results/result-screen-labels';
export type { GameInstructionsScreenProps } from './types/game-instructions-screen';
export type { GameFailureScreenProps, GameSuccessScreenProps } from './types/game-result-screen';
export type {
  InstructionItem,
  InstructionItemVariant,
  InstructionSlide,
  StageContent,
  StageContentMap,
  StageInstructionContent,
  StageInstructionContentMap,
} from './types/instruction-content';
export type {
  GameResultContent,
  GameResultContentMap,
  GameResultVariant,
  ResultScreenLabels,
} from './types/result-content';
export type { StageId, StageThemeColor } from './types/stage-theme';
