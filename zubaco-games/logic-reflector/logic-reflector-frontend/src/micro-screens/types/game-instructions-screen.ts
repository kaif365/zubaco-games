import type { StageInstructionContentMap } from './instruction-content';
import type { StageId } from './stage-theme';

export interface GameInstructionsScreenProps {
  stage: StageId;
  contentByStage?: Partial<StageInstructionContentMap>;
  onPlayNow?: (stage: StageId) => void;
  isPlayNowLoading?: boolean;
  onLearnHowToPlay?: (stage: StageId) => void;
  hideLearnHowToPlay?: boolean;
  className?: string;
}
