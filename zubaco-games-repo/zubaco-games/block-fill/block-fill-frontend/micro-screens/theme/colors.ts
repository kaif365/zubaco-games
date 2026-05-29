import type { StageId, StageThemeColor } from "../src/types/stage-theme";

export type { StageId, StageThemeColor } from "../src/types/stage-theme";

export const STAGE_THEME_COLORS: Record<StageId, StageThemeColor> = {
  1: {
    background: "#19224D",
    eclipse: "#364BAE",
    resultAccent: "#6D85FF",
  },
  2: {
    background: "#210D34",
    eclipse: "#52277B",
    resultAccent: "#7F3FBC",
  },
  3: {
    background: "#3C0F2D",
    eclipse: "#75295C",
    resultAccent: "#C54E9E",
  },
  4: {
    background: "#0D2320",
    eclipse: "#205A52",
    resultAccent: "#25B19A",
  },
  5: {
    background: "#092C39",
    eclipse: "#206078",
    resultAccent: "#2FB0DF",
  },
  6: {
    background: "#43174C",
    eclipse: "#772C86",
    resultAccent: "#E562FF",
  },
  7: {
    background: "#5B2D1A",
    eclipse: "#9C4A29",
    resultAccent: "#FB804B",
  },
};
