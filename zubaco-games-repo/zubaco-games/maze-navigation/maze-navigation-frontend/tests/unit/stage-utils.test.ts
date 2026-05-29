import {
  getConfiguredApiStageId,
  getConfiguredUiStageId,
  normalizeStageId,
} from "@/utils/stage/stage-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@app/config/appConfig", () => ({
  appConfig: {
    stage: {
      id: "8f3c2e4b-7a9d-4d6f-9c21-5b8e2f4a1d90",
      number: 2,
    },
  },
}));

describe("normalizeStageId", () => {
  it("clamps to 1–4", () => {
    expect(normalizeStageId(2)).toBe(2);
    expect(normalizeStageId(99)).toBe(4);
    expect(normalizeStageId(Number.NaN)).toBe(1);
  });
});

describe("configured stage from app config", () => {
  it("returns ui stage number from env", () => {
    expect(getConfiguredUiStageId()).toBeGreaterThanOrEqual(1);
    expect(getConfiguredUiStageId()).toBeLessThanOrEqual(4);
  });

  it("returns api stage id from env", () => {
    expect(getConfiguredApiStageId().length).toBeGreaterThan(0);
  });
});
