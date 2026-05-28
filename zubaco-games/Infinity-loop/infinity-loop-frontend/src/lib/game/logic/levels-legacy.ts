// /modules/game/logic/levels.ts
import { MOCK_LEVELS } from "@/mocks/mock-levels-legacy";
import { TileType } from "@/types/tile";
import { getTileDefinitionForKey } from "@/utils/tile-bitmasks";

export interface LevelDefinition {
  width: number;
  height: number;
  tiles: { type: TileType; correctRotation: number }[][];
  mobileInsetScale?: number;
}

const mapMockToLevelDefinition = (): LevelDefinition[] => {
  return MOCK_LEVELS.map((level) => ({
    width: level.width,
    height: level.height,
    mobileInsetScale: level.mobileInsetScale,
    tiles: level.tiles.map((row) =>
      row.map((tileKey) => {
        const definition = getTileDefinitionForKey(tileKey);
        if (!definition) {
          return { type: TileType.EMPTY, correctRotation: 0 };
        }
        return {
          type: definition.type,
          correctRotation: definition.rotation,
        };
      }),
    ),
  }));
};

export const HANDCRAFTED_LEVELS: LevelDefinition[] = mapMockToLevelDefinition();

export const getHandcraftedLevel = (index: number): LevelDefinition | null => {
  if (HANDCRAFTED_LEVELS.length === 0) return null;
  return HANDCRAFTED_LEVELS[index % HANDCRAFTED_LEVELS.length] ?? null;
};
