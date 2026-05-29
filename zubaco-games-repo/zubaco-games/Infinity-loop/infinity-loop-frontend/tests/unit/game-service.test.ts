import { beforeEach, describe, expect, it, vi } from "vitest";

import gameServices, { type SaveGameLevelPayload } from "@/services/api/game";
import URL from "@/services/endpoints";

const {
  mockHttpGet,
  mockHttpPost,
  mockHttpPut,
  mockHttpPatch,
  mockHttpDelete,
} = vi.hoisted(() => ({
  mockHttpGet: vi.fn(),
  mockHttpPost: vi.fn(),
  mockHttpPut: vi.fn(),
  mockHttpPatch: vi.fn(),
  mockHttpDelete: vi.fn(),
}));

vi.mock("@/services/fetcher", () => ({
  httpGet: mockHttpGet,
  httpPost: mockHttpPost,
  httpPut: mockHttpPut,
  httpPatch: mockHttpPatch,
  httpDelete: mockHttpDelete,
}));

vi.mock("@/services/service-error-handler", () => ({
  handleServerError: (error: unknown) => ({
    message: error instanceof Error ? error.message : String(error),
    errors: undefined,
  }),
}));

describe("game service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets all levels from GAME_LEVELS", async () => {
    mockHttpGet.mockResolvedValueOnce([]);
    await gameServices.getLevels();
    expect(mockHttpGet).toHaveBeenCalledWith(URL.GAME_LEVELS);
  });

  it("gets one level by id", async () => {
    mockHttpGet.mockResolvedValueOnce({ id: "lvl-1" });
    await gameServices.getLevelById("lvl-1");
    expect(mockHttpGet).toHaveBeenCalledWith(URL.GAME_LEVEL_BY_ID("lvl-1"));
  });

  it("creates a level with expected payload", async () => {
    const payload: SaveGameLevelPayload = {
      stage: 1,
      name: "Level 1",
      tiles: [["A"]],
    };
    mockHttpPost.mockResolvedValueOnce({ id: "lvl-1", ...payload });
    await gameServices.createLevel(payload);
    expect(mockHttpPost).toHaveBeenCalledWith(URL.GAME_LEVELS, payload);
  });

  it("updates a level by id", async () => {
    const payload: SaveGameLevelPayload = {
      stage: 2,
      name: "Level 2",
      tiles: [["B"]],
    };
    mockHttpPut.mockResolvedValueOnce({ id: "lvl-2", ...payload });
    await gameServices.updateLevel("lvl-2", payload);
    expect(mockHttpPut).toHaveBeenCalledWith(
      URL.GAME_LEVEL_BY_ID("lvl-2"),
      payload,
    );
  });

  it("patches a level by id", async () => {
    const payload: Partial<SaveGameLevelPayload> = { name: "Renamed" };
    mockHttpPatch.mockResolvedValueOnce({ id: "lvl-2", ...payload });
    await gameServices.patchLevel("lvl-2", payload);
    expect(mockHttpPatch).toHaveBeenCalledWith(
      URL.GAME_LEVEL_BY_ID("lvl-2"),
      payload,
    );
  });

  it("deletes a level by id", async () => {
    mockHttpDelete.mockResolvedValueOnce({ success: true });
    await gameServices.deleteLevel("lvl-3");
    expect(mockHttpDelete).toHaveBeenCalledWith(URL.GAME_LEVEL_BY_ID("lvl-3"));
  });
});
