import { GameInstructionsScreen, GameInstructionsSkeleton } from '@micro-screens/src';
import type { StageId } from '@micro-screens/src';
import type { StageInstructionContentMap } from '@micro-screens/src/types/instruction-content';

interface InstructionsLobbyScreenProps {
  stage?: StageId;
  isStarting: boolean;
  enableLearnHowToPlay: boolean;
  onPlayNow: () => void;
  onLearnHowToPlay?: () => void;
  contentByStage?: Partial<StageInstructionContentMap>;
  isContentLoading?: boolean;
}

export function InstructionsLobbyScreen({
  stage,
  isStarting,
  enableLearnHowToPlay,
  onPlayNow,
  onLearnHowToPlay,
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
      onLearnHowToPlay={enableLearnHowToPlay && onLearnHowToPlay ? () => { onLearnHowToPlay(); } : undefined}
      hideLearnHowToPlay={!enableLearnHowToPlay}
    />
  );
}
