import { GameInstructionsScreen, GameInstructionsSkeleton } from '@micro-screens/src';
import type { StageId } from '@micro-screens/src';
import type { StageInstructionContentMap } from '@micro-screens/src/types/instruction-content';

interface InstructionsLobbyScreenProps {
  stage?: StageId;
  isStarting: boolean;
  onPlayNow: () => void;
  onLearnHowToPlay?: () => void;
  hideLearnHowToPlay?: boolean;
  contentByStage?: Partial<StageInstructionContentMap>;
  isContentLoading?: boolean;
}

export function InstructionsLobbyScreen({
  stage,
  isStarting,
  onPlayNow,
  onLearnHowToPlay,
  hideLearnHowToPlay = false,
  contentByStage,
  isContentLoading = false,
}: InstructionsLobbyScreenProps) {
  const safeStage: StageId = stage ?? 1;

  if (isContentLoading) {
    return <GameInstructionsSkeleton stage={safeStage} />;
  }

  return (
    <GameInstructionsScreen
      stage={safeStage}
      contentByStage={contentByStage}
      onPlayNow={isStarting ? undefined : () => { onPlayNow(); }}
      isPlayNowLoading={isStarting}
      onLearnHowToPlay={onLearnHowToPlay ? () => { onLearnHowToPlay(); } : undefined}
      hideLearnHowToPlay={hideLearnHowToPlay}
    />
  );
}
