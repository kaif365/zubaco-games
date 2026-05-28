import type { StageId, StageThemeColor } from "../src/types/stage-theme";

export type { StageId, StageThemeColor } from "../src/types/stage-theme";

export const STAGE_THEME_COLORS: Record<StageId, StageThemeColor> = {
  1: {
    background: "#0f0a1e",
    eclipse: "#1e1545",
    resultAccent: "#00f0ff",
  },
  2: {
    background: "#0a1628",
    eclipse: "#153050",
    resultAccent: "#38d9ff",
  },
  3: {
    background: "#12071f",
    eclipse: "#2d1560",
    resultAccent: "#a78bfa",
  },
  4: {
    background: "#071a1a",
    eclipse: "#0f3d3d",
    resultAccent: "#10b981",
  },
  5: {
    background: "#0f0a1e",
    eclipse: "#3b1f7a",
    resultAccent: "#c084fc",
  },
  6: {
    background: "#1a0520",
    eclipse: "#4a1560",
    resultAccent: "#e879f9",
  },
  7: {
    background: "#0a1020",
    eclipse: "#1e3a5f",
    resultAccent: "#67e8f9",
  }
};
