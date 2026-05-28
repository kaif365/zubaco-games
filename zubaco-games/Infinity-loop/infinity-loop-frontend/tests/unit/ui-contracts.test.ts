import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readSourceFile = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("header ui composition contracts", () => {
  it("keeps extracted header logo component in molecules", () => {
    const logoSource = readSourceFile(
      "src/components/molecules/game-header-logo.tsx",
    );

    expect(logoSource).toContain("export const GameHeaderLogo =");
    expect(logoSource).toContain("readonly name: string");
    expect(logoSource).toContain("readonly tagline: string");
    expect(logoSource).toContain("readonly accentColor: string");
  });

  it("uses extracted GameHeaderLogo from GameHeader organism", () => {
    const headerSource = readSourceFile(
      "src/components/organisms/game-header.tsx",
    );

    expect(headerSource).toContain(
      'import { GameHeaderLogo } from "@/components/molecules/game-header-logo"',
    );
    expect(headerSource).toContain("<GameHeaderLogo");
    expect(headerSource).toContain('t("game.brandName")');
    expect(headerSource).toContain('t("game.brandTagline")');
  });
});
