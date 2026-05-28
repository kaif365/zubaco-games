import type { StageInstructionContentMap } from "./instruction-content";
import type { StageId } from "./stage-theme";

export interface GameInstructionsScreenProps {
  stage: StageId;
  contentByStage?: Partial<StageInstructionContentMap>;
  /** When true, Play Now is disabled (e.g. session bootstrap in flight). */
  isPlayPrimaryDisabled?: boolean;
  onPlayNow?: (stage: StageId) => void | Promise<void>;
  onLearnHowToPlay?: (stage: StageId) => void | Promise<void>;
  className?: string;
}
