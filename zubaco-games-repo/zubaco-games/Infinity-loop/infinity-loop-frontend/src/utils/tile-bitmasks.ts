import {
  TILE_BITMASK_DEFINITIONS,
  type TileBitmaskDefinition,
} from "@/constants/tile-bitmasks";
import { TileType } from "@/types/tile";

const TEE_ROTATION_IDS = [7, 14, 13, 11] as const;
const CURVED_V_ROTATION_IDS = [31, 47, 79, 143] as const;

export const getTileDefinitionForBitmask = (
  bitmask: number,
  preferredType?: TileType,
): TileBitmaskDefinition => {
  if (preferredType) {
    const preferred = TILE_BITMASK_DEFINITIONS.find(
      (definition) =>
        definition.bitmask === bitmask && definition.type === preferredType,
    );
    if (preferred) return preferred;
  }

  const matched = TILE_BITMASK_DEFINITIONS.find(
    (definition) =>
      definition.bitmask === bitmask && definition.type !== TileType.CURVED_V,
  );
  if (matched) return matched;

  return TILE_BITMASK_DEFINITIONS[0];
};

export const getTileDefinitionForBackendId = (
  tileId: number,
): TileBitmaskDefinition => {
  const curvedRotation = CURVED_V_ROTATION_IDS.indexOf(
    tileId as (typeof CURVED_V_ROTATION_IDS)[number],
  );
  if (curvedRotation >= 0) {
    return (
      TILE_BITMASK_DEFINITIONS.find(
        (definition) =>
          definition.type === TileType.CURVED_V &&
          definition.rotation === curvedRotation,
      ) ?? TILE_BITMASK_DEFINITIONS[0]
    );
  }

  const teeRotation = TEE_ROTATION_IDS.indexOf(
    tileId as (typeof TEE_ROTATION_IDS)[number],
  );
  if (teeRotation >= 0) {
    return (
      TILE_BITMASK_DEFINITIONS.find(
        (definition) =>
          definition.type === TileType.TEE &&
          definition.rotation === teeRotation,
      ) ?? TILE_BITMASK_DEFINITIONS[0]
    );
  }

  const normalizedBitmask = ((tileId % 16) + 16) % 16;
  return getTileDefinitionForBitmask(normalizedBitmask);
};

export const getTileDefinitionForKey = (
  key: string,
): TileBitmaskDefinition | null => {
  return (
    TILE_BITMASK_DEFINITIONS.find((definition) => definition.key === key) ??
    null
  );
};

export const getBaseBitmaskForType = (type: TileType): number => {
  const baseDefinition = TILE_BITMASK_DEFINITIONS.find(
    (definition) => definition.type === type && definition.rotation === 0,
  );
  return baseDefinition?.bitmask ?? 0;
};

export const getBackendIdForTypeAndRotation = (
  type: TileType,
  rotation: number,
): number => {
  const normalizedRotation = ((rotation % 4) + 4) % 4;
  if (type === TileType.CURVED_V) {
    return CURVED_V_ROTATION_IDS[normalizedRotation];
  }
  if (type === TileType.TEE) {
    return TEE_ROTATION_IDS[normalizedRotation];
  }
  const bitmask = getBaseBitmaskForType(type);
  if (normalizedRotation === 0) return bitmask & 0b1111;
  return (
    ((bitmask << normalizedRotation) | (bitmask >> (4 - normalizedRotation))) &
    0b1111
  );
};
