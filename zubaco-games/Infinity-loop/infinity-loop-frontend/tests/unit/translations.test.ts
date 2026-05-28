import { describe, expect, it } from "vitest";

import { getTranslation } from "@/lib/i18n/server";

describe("translations", () => {
  it("returns nested message keys from english locale", async () => {
    const { t } = await getTranslation();
    expect(t("header.moves")).toBe("Moves");
    expect(t("game.startModalPrimaryCta")).toBe("Start Game");
  });

  it("interpolates runtime variables in localized strings", async () => {
    const { t } = await getTranslation();
    expect(
      t("game.winToastDescription", {
        level: 4,
        moves: 18,
      }),
    ).toBe("Level 4 cleared in 18 moves.");
    expect(t("game.finishDescriptionWon", { moves: 12 })).toBe(
      "You resolved the loop in 12 moves.",
    );
    expect(t("game.startModalFooter", { audio: "ON" })).toBe(
      "Tutorial • Audio Effects: ON",
    );
  });

  it("falls back to key when path is missing", async () => {
    const { t } = await getTranslation();
    expect(t("game.unknown.path")).toBe("game.unknown.path");
  });
});
