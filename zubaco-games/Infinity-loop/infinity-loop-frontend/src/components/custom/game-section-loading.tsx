"use client";

import { GamePlayArea } from "@/components/custom/game-play-area";
import { MobileGameStatsChip } from "@/components/custom/mobile-game-stats-chip";
import { GameHeader } from "@/components/organisms/game-header";
import { GameTemplate } from "@/components/templates/game-template";

interface GameSectionLoadingProps {
  theme: { primary: string; glow: string; background: string };
  activeAccentColor: string;
  showHintButton: boolean;
}

export const GameSectionLoading = ({
  theme,
  activeAccentColor,
  showHintButton,
}: GameSectionLoadingProps) => {
  return (
    <GameTemplate theme={theme}>
      <GameHeader
        key={`loading-header-${activeAccentColor}`}
        onSettingsClick={() => {}}
        onHint={() => {}}
        showHintButton={showHintButton}
        isHintDisabled={!showHintButton}
        primaryColor={activeAccentColor}
      />
      <div className="min-h-9 w-full pt-1" aria-hidden="true" />

      <div className="flex w-full flex-1 flex-col justify-center">
        <MobileGameStatsChip
          moves={0}
          timeLeftSeconds={0}
          timeShowsInfinity={showHintButton}
          showSkeleton
          accentColor={activeAccentColor}
        />

        <GamePlayArea
          shouldRenderGrid={false}
          grid={[]}
          theme={theme}
          onTileClick={() => {}}
          isSolvedHighlightActive={false}
          isBoardTransitionActive={false}
          hintMessage={null}
          hintIsWon={false}
          hintIsTimeUp={false}
          hintReserveVerticalSlot={showHintButton}
          sessionBadgeLabel={null}
        />
      </div>
    </GameTemplate>
  );
};
