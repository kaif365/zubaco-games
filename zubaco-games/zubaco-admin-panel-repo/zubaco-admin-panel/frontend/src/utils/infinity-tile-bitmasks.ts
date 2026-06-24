// Infinity Loop tile encoding helpers.
// These are isolated to Infinity-related code paths.

export type InfinityTileType =
  | "empty"
  | "cap"
  | "straight"
  | "elbow"
  | "tee"
  | "curved_v"
  | "cross";

type TileBitmaskDefinition = {
  type: InfinityTileType;
  rotation: number;
  bitmask: number;
};

// Keep this aligned with Infinity Loop backend definitions/rotations.
const TILE_BITMASK_DEFINITIONS: TileBitmaskDefinition[] = [
  { type: "empty", rotation: 0, bitmask: 0b0000 },
  { type: "cap", rotation: 0, bitmask: 0b0001 },
  { type: "cap", rotation: 1, bitmask: 0b0010 },
  { type: "cap", rotation: 2, bitmask: 0b0100 },
  { type: "cap", rotation: 3, bitmask: 0b1000 },
  { type: "straight", rotation: 0, bitmask: 0b0101 }, // vertical
  { type: "straight", rotation: 1, bitmask: 0b1010 }, // horizontal
  { type: "elbow", rotation: 0, bitmask: 0b0011 },
  { type: "elbow", rotation: 1, bitmask: 0b0110 },
  { type: "elbow", rotation: 2, bitmask: 0b1100 },
  { type: "elbow", rotation: 3, bitmask: 0b1001 },
  { type: "tee", rotation: 0, bitmask: 0b0111 },
  { type: "tee", rotation: 1, bitmask: 0b1110 },
  { type: "tee", rotation: 2, bitmask: 0b1101 },
  { type: "tee", rotation: 3, bitmask: 0b1011 },
  { type: "cross", rotation: 0, bitmask: 0b1111 },
  { type: "curved_v", rotation: 0, bitmask: 0b0111 },
  { type: "curved_v", rotation: 1, bitmask: 0b1110 },
  { type: "curved_v", rotation: 2, bitmask: 0b1101 },
  { type: "curved_v", rotation: 3, bitmask: 0b1011 },
];

const TEE_ROTATION_IDS = [7, 14, 13, 11] as const;
const CURVED_V_ROTATION_IDS = [31, 47, 79, 143] as const;

const normalizeRotation = (rotation: number): number =>
  ((rotation % 4) + 4) % 4;

const rotateFourBitmask = (bitmask: number, steps: number): number => {
  const normalized = normalizeRotation(steps);
  if (normalized === 0) return bitmask & 0b1111;
  return ((bitmask << normalized) | (bitmask >> (4 - normalized))) & 0b1111;
};

const fourBitIdToDefinition = (id: number) => {
  const normalized = ((id % 16) + 16) % 16;
  return (
    TILE_BITMASK_DEFINITIONS.find(
      (definition) =>
        definition.bitmask === normalized && definition.type !== "curved_v",
    ) ?? TILE_BITMASK_DEFINITIONS[0]
  );
};

export function backendTileIdToTypeAndRotation(tileId: number): {
  type: InfinityTileType;
  rotation: number;
} {
  if (!Number.isFinite(tileId)) return { type: "empty", rotation: 0 };

  const curvedRotation = CURVED_V_ROTATION_IDS.indexOf(
    tileId as (typeof CURVED_V_ROTATION_IDS)[number],
  );
  if (curvedRotation >= 0) {
    return { type: "curved_v", rotation: curvedRotation };
  }

  const teeRotation = TEE_ROTATION_IDS.indexOf(
    tileId as (typeof TEE_ROTATION_IDS)[number],
  );
  if (teeRotation >= 0) {
    return { type: "tee", rotation: teeRotation };
  }

  const definition = fourBitIdToDefinition(tileId);
  return { type: definition.type, rotation: definition.rotation };
}

export function typeAndRotationToBackendTileId(
  type: InfinityTileType,
  rotation: number,
): number {
  const normalizedRotation = normalizeRotation(rotation);

  if (type === "curved_v") {
    return CURVED_V_ROTATION_IDS[normalizedRotation];
  }

  if (type === "tee") {
    return TEE_ROTATION_IDS[normalizedRotation];
  }

  const baseBitmask =
    TILE_BITMASK_DEFINITIONS.find(
      (definition) => definition.type === type && definition.rotation === 0,
    )?.bitmask ?? 0;

  return rotateFourBitmask(baseBitmask, normalizedRotation);
}
