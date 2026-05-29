import { DEFAULT_GAME_CONFIG } from "@/config/game-config";
import { describe, expect, it } from "vitest";

describe("game config branding", () => {
  it("uses Infinity Loop branding", () => {
    expect(DEFAULT_GAME_CONFIG.gameMeta.name).toBe("Infinity Loop");
  });
});
