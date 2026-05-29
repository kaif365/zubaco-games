import { describe, expect, it, vi } from "vitest";

vi.mock("@app/config/appConfig", () => ({
  appConfig: {
    api: {
      baseUrl: "http://localhost:3005",
      mockUserSessionUrl: "https://mock.example/session",
      adminBaseUrl: "https://admin.example",
    },
    stage: {
      id: "stage-uuid-test",
      number: 3,
      contentGameType: "MAZE_NAVIGATION",
    },
    encryption: {
      enabled: false,
      key: "",
    },
  },
}));

describe("appConfig (mocked)", () => {
  it("imports typed config from @app/config/appConfig", async () => {
    const { appConfig } = await import("@app/config/appConfig");
    expect(appConfig.api.baseUrl).toBe("http://localhost:3005");
    expect(appConfig.stage.number).toBe(3);
    expect(appConfig.stage.contentGameType).toBe("MAZE_NAVIGATION");
    expect(appConfig.encryption.enabled).toBe(false);
  });
});
