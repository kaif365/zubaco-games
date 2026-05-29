"use client";

import { GAME_PLAY_SURFACE } from "@/constants/game-play-surface";
import { GameProvider } from "@/context/game-context";
import { GameSection } from "@/section/game/game-section";
import { getEnvStageId } from "@/utils/get-env-stage-id";

export default function Home() {
  const stageId = getEnvStageId() ?? "";

  return (
    <GameProvider surface={GAME_PLAY_SURFACE.TUTORIAL} stageId={stageId}>
      <GameSection stageId={stageId} phase="instructions" />
    </GameProvider>
  );
}
