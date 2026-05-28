import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";

import { en } from "@/locales/en";
import { hi } from "@/locales/hi";

beforeAll(async () => {
  if (!i18next.isInitialized) {
    await i18next.use(initReactI18next).init({
      lng: "en",
      fallbackLng: "en",
      resources: { en, hi },
      interpolation: { prefix: "{", suffix: "}" },
    });
  }
});

describe("translations", () => {
  it("returns nested message keys from english locale", async () => {
    await i18next.changeLanguage("en");
    expect(i18next.t("hud.level")).toBe("Level");
    expect(i18next.t("instructions.primaryCtaLabel")).toBe("Play Now");
  });

  it("returns hindi strings when language is hi", async () => {
    await i18next.changeLanguage("hi");
    expect(i18next.t("instructions.primaryCtaLabel")).toBe("अभी खेलें");
  });

  it("falls back to key when path is missing", async () => {
    await i18next.changeLanguage("en");
    expect(i18next.t("game.unknown.path")).toBe("game.unknown.path");
  });
});
