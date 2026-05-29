import type { StageId, StageInstructionContentMap } from '@micro-screens/src';
import { GameInstructionsScreen } from '@micro-screens/src';

interface InstructionsScreenProps {
  stage: StageId;
  onPlayNow: () => void;
  onLearnHowToPlay: () => void;
  hideLearnHowToPlay?: boolean;
  contentByStage?: Partial<StageInstructionContentMap>;
}

export function InstructionsScreen({
  stage,
  onPlayNow,
  onLearnHowToPlay,
  hideLearnHowToPlay = false,
  contentByStage,
}: InstructionsScreenProps) {
  return (
    <GameInstructionsScreen
      stage={stage}
      contentByStage={contentByStage}
      onPlayNow={onPlayNow}
      onLearnHowToPlay={onLearnHowToPlay}
      hideLearnHowToPlay={hideLearnHowToPlay}
    />
  );
}
