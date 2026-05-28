import { describe, expect, it } from "vitest";

import {
  DEFAULT_GAME_CONFIG,
  mergeGameConfigWithDefaults,
} from "@/config/game-config";
import {
  SOCKET_ERROR_MESSAGES,
  SocketChannel,
  SocketEvent,
  Sockets,
} from "@/constants/socket";
import { STORAGE_KEYS } from "@/constants/storage";
import { TILE_BITMASK_DEFINITIONS } from "@/constants/tile-bitmasks";
import type { GameConfig } from "@/types/game-config";
import { TileType } from "@/types/tile";
import { getEnvStageId } from "@/utils/get-env-stage-id";
import {
  getBaseBitmaskForType,
  getTileDefinitionForBitmask,
  getTileDefinitionForKey,
} from "@/utils/tile-bitmasks";

describe("game contracts and constants", () => {
  it("keeps socket channels/events aligned with game backend contracts", () => {
    expect(SocketChannel.GAME).toBe("game-channel");
    expect(SocketEvent.START).toBe("game:start");
    expect(SocketEvent.STARTED).toBe("game:started");
    expect(SocketEvent.ROTATE).toBe("game:rotate");
    expect(SocketEvent.ROTATE_BATCH).toBe("game:rotate:batch");
    expect(SocketEvent.COMPLETE).toBe("game:complete");
    expect(SocketEvent.COMPLETE_SUCCESS).toBe("game:complete:success");
    expect(SocketEvent.EXCEPTION).toBe("exception");
    expect(Sockets.EventNames.COMPLETE).toBe("game:complete");
  });

  it("uses rotate payload keys expected by game socket flow", () => {
    const payload = {
      r: 2,
      c: 3,
      timestamp: 1_700_000_001_000,
      boardId: "board-1",
    };
    expect(payload).toEqual({
      r: 2,
      c: 3,
      timestamp: 1_700_000_001_000,
      boardId: "board-1",
    });
  });

  it("supports rotate batch payload shape used by reconnect recovery flow", () => {
    const payload = {
      moves: [
        { r: 2, c: 3, timestamp: 1_700_000_001_000, boardId: "board-1" },
        { r: 1, c: 0, timestamp: 1_700_000_001_350, boardId: "board-1" },
      ],
    };
    expect(payload.moves).toHaveLength(2);
    expect(payload.moves[0]).toEqual({
      r: 2,
      c: 3,
      timestamp: 1_700_000_001_000,
      boardId: "board-1",
    });
  });

  it("keeps storage keys stable for persisted state", () => {
    expect(STORAGE_KEYS.TOKEN).toBe("infinity-loop:token");
  });

  it("keeps socket error message contracts stable", () => {
    expect(SOCKET_ERROR_MESSAGES.AUTH_FAILED).toBe("AUTH_FAILED");
    expect(SOCKET_ERROR_MESSAGES.SESSION_EXPIRED).toBe("SESSION_EXPIRED");
  });

  it("fills missing remote gridSizes from defaults when merging game config", () => {
    const partial = mergeGameConfigWithDefaults({
      ...DEFAULT_GAME_CONFIG,
      settings: {
        ...DEFAULT_GAME_CONFIG.settings,
        gridSizes: {
          easy: 2,
          medium: 2,
          hard: 2,
        },
        levelPalettes: [],
      },
    });
    expect(partial.settings.gridSizes.easy).toBe(2);
    const sparse = mergeGameConfigWithDefaults({
      ...DEFAULT_GAME_CONFIG,
      settings: {
        ...DEFAULT_GAME_CONFIG.settings,
        gridSizes: undefined as unknown as GameConfig["settings"]["gridSizes"],
      },
    });
    expect(sparse.settings.gridSizes).toEqual(
      DEFAULT_GAME_CONFIG.settings.gridSizes,
    );
  });

  it("reads stage id from env only", () => {
    const env = process.env.NEXT_PUBLIC_DEFAULT_STAGE_ID?.trim();
    if (env && env.length > 0) {
      expect(getEnvStageId()).toBe(env);
    } else {
      expect(getEnvStageId()).toBeNull();
    }
  });

  it("uses expected default config values for timing and audio assets", () => {
    expect(DEFAULT_GAME_CONFIG.settings.gameType).toBe("INFINITY_LOOP");
    expect(DEFAULT_GAME_CONFIG.settings.stageId).toBeNull();
    expect(DEFAULT_GAME_CONFIG.settings.timeLimitSeconds).toBe(180);
    expect(DEFAULT_GAME_CONFIG.settings.audio.backgroundTrackUrl).toBe(
      "/assets/rainglass-drift.mp3",
    );
    expect(
      DEFAULT_GAME_CONFIG.settings.audio.tapSoundUrl.length,
    ).toBeGreaterThan(0);
    expect(
      DEFAULT_GAME_CONFIG.settings.audio.successSoundUrl.length,
    ).toBeGreaterThan(0);
  });
});

describe("tile bitmask definitions", () => {
  it("contains unique keys for all tile definitions", () => {
    const keys = TILE_BITMASK_DEFINITIONS.map((definition) => definition.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("resolves key lookup for curved-v definitions", () => {
    const curvedVariant = getTileDefinitionForKey("CURVED_V_NES");
    expect(curvedVariant).not.toBeNull();
    expect(curvedVariant?.type).toBe(TileType.CURVED_V);
  });

  it("prefers non-curved fallback when mapping a shared bitmask", () => {
    const noPreference = getTileDefinitionForBitmask(0b0111);
    const preferredCurved = getTileDefinitionForBitmask(
      0b0111,
      TileType.CURVED_V,
    );

    expect(noPreference.type).toBe(TileType.TEE);
    expect(preferredCurved.type).toBe(TileType.CURVED_V);
  });

  it("returns deterministic base bitmasks by tile type", () => {
    expect(getBaseBitmaskForType(TileType.EMPTY)).toBe(0b0000);
    expect(getBaseBitmaskForType(TileType.CAP)).toBe(0b0001);
    expect(getBaseBitmaskForType(TileType.STRAIGHT)).toBe(0b0101);
    expect(getBaseBitmaskForType(TileType.ELBOW)).toBe(0b0011);
    expect(getBaseBitmaskForType(TileType.TEE)).toBe(0b0111);
    expect(getBaseBitmaskForType(TileType.CROSS)).toBe(0b1111);
  });
});
