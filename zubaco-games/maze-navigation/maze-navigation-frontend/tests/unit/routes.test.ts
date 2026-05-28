import { paths, type AppRoute } from "@app/router/routes";
import { describe, expect, it } from "vitest";

describe("paths", () => {
  it("defines SPA route paths", () => {
    expect(paths.home).toBe("/");
    expect(paths.demo).toBe("/demo");
    expect(paths.game).toBe("/game");
    expect(paths.results).toBe("/result");
  });

  it("exposes stable route keys", () => {
    const routes: AppRoute[] = [
      paths.home,
      paths.demo,
      paths.game,
      paths.results,
    ];
    expect(routes).toHaveLength(4);
    expect(new Set(routes).size).toBe(4);
  });
});
