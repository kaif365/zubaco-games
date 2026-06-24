import type { GameConfig } from "@/types/game-config";
import {
  fetchStageGameConfigByStageId,
  updateStageGameConfig as apiUpdateStageGameConfig,
} from "@/lib/api/endpoints/stage-game-configs";

export async function fetchStageGameConfig(
  stageId: string,
  gameName: string,
): Promise<GameConfig | null | undefined> {
  return fetchStageGameConfigByStageId(stageId, gameName);
}

export async function updateStageGameConfig(
  config: GameConfig,
  gameName: string,
): Promise<GameConfig> {
  const updated = await apiUpdateStageGameConfig(config, gameName);
  return updated ?? config;
}
