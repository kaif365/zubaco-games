import type { StageInstructionContentMap } from "./instruction-content";
import type { StageId } from "./stage-theme";

export interface GameInstructionsScreenProps {
  stage: StageId;
  contentByStage?: Partial<StageInstructionContentMap>;
  onPlayNow?: (stage: StageId) => void;
  isPlayNowLoading?: boolean;
  disablePlayNow?: boolean;
  onLearnHowToPlay?: (stage: StageId) => void;
  isLearnHowToPlayLoading?: boolean;
  disableLearnHowToPlay?: boolean;
  hideLearnHowToPlay?: boolean;
  className?: string;
}
