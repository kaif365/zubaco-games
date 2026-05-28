// /modules/game/logic/tile.utils.ts
import { DIRECTION_MASK } from "@/constants/tile-bitmasks";
import { Directions, TileState, TileType } from "@/types/tile";
import {
  getBaseBitmaskForType,
  getTileDefinitionForBitmask,
} from "@/utils/tile-bitmasks";

export const bitmaskToDirections = (bitmask: number): Directions => {
  return {
    top: Boolean(bitmask & DIRECTION_MASK.N),
    right: Boolean(bitmask & DIRECTION_MASK.E),
    bottom: Boolean(bitmask & DIRECTION_MASK.S),
    left: Boolean(bitmask & DIRECTION_MASK.W),
  };
};

export const directionsToBitmask = (connections: Directions): number => {
  return (
    (connections.top ? DIRECTION_MASK.N : 0) |
    (connections.right ? DIRECTION_MASK.E : 0) |
    (connections.bottom ? DIRECTION_MASK.S : 0) |
    (connections.left ? DIRECTION_MASK.W : 0)
  );
};

export const rotateBitmask = (bitmask: number, steps: number): number => {
  const normalized = ((steps % 4) + 4) % 4;
  if (normalized === 0) return bitmask & 0b1111;
  return ((bitmask << normalized) | (bitmask >> (4 - normalized))) & 0b1111;
};

export const getBaseConnections = (type: TileType): Directions => {
  return bitmaskToDirections(getBaseBitmaskForType(type));
};

export const rotateConnections = (
  connections: Directions,
  steps: number,
): Directions => {
  return bitmaskToDirections(
    rotateBitmask(directionsToBitmask(connections), steps),
  );
};

export const getConnectionsForState = (
  state: Pick<TileState, "type" | "rotation">,
): Directions => {
  const baseBitmask = getBaseBitmaskForType(state.type);
  return bitmaskToDirections(rotateBitmask(baseBitmask, state.rotation));
};

export const getTileFromConnections = (
  connections: Directions,
  preferredType?: TileType,
): Pick<TileState, "type" | "rotation" | "connections"> => {
  const bitmask = directionsToBitmask(connections);
  const definition = getTileDefinitionForBitmask(bitmask, preferredType);
  return {
    type: definition.type,
    rotation: definition.rotation,
    connections: bitmaskToDirections(definition.bitmask),
  };
};
