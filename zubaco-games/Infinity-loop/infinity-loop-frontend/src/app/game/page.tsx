"use client";

import { GAME_PLAY_SURFACE } from "@/constants/game-play-surface";
import { GameProvider } from "@/context/game-context";
import { GameSection } from "@/section/game/game-section";
import { getEnvStageId } from "@/utils/get-env-stage-id";

export default function LiveGamePage() {
  const stageId = getEnvStageId() ?? "";

  return (
    <GameProvider surface={GAME_PLAY_SURFACE.LIVE} stageId={stageId}>
      <GameSection stageId={stageId} phase="live" />
    </GameProvider>
  );
}
