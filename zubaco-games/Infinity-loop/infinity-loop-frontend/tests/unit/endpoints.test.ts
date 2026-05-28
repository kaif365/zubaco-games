import { describe, expect, it } from "vitest";

import URL, {
  ADMIN_BASE,
  namespaces,
  USER_BASE,
  VERSION,
} from "@/services/endpoints";

describe("service endpoints", () => {
  it("keeps namespace stable", () => {
    expect(namespaces).toBe("api");
  });

  it("exposes API path constants", () => {
    expect(VERSION).toBe("v1");
    expect(USER_BASE).toBe("user");
    expect(ADMIN_BASE).toBe("admin");
  });

  it("builds level endpoints from shared base", () => {
    expect(URL.GAME_LEVELS).toBe("game/levels");
    expect(URL.GAME_LEVEL_BY_ID("abc")).toBe("game/levels/abc");
  });

  it("exposes mock user auth path", () => {
    expect(URL.USER_AUTH_DEV_SESSION).toBe("user/auth/dev-session");
  });

  it("exposes user demo path", () => {
    expect(URL.USER_DEMO).toBe("v1/user/demo");
  });

  it("exposes admin stage-content path", () => {
    expect(URL.ADMIN_GAMES_STAGE_CONTENT).toBe("admin/games/stage-content");
  });
});
