import type {
  InstructionSlide,
  StageInstructionContentMap,
} from "@/types/instruction-content";
import type {
  StageContentApiData,
  StageContentApiPage,
} from "@/types/stage-content-api";
import type { StageId } from "@/types/stage-theme";

export function isStageContentEnvelope(
  data: unknown,
): data is StageContentApiData {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const record = data as Record<string, unknown>;
  if (!("content_section" in record)) {
    return false;
  }
  const section = record.content_section;
  return section !== null && typeof section === "object";
}

function mapApiPageToSlide(
  page: StageContentApiPage,
  pageIndex: number,
): InstructionSlide {
  return {
    id: `cms-page-${pageIndex}`,
    title: page.title,
    description: page.description,
    items: page.points.map((point, pointIndex) => ({
      id: `cms-page-${pageIndex}-pt-${pointIndex}`,
      title: point.title,
      description: point.description,
      variant: "step" as const,
    })),
  };
}

/**
 * Maps stage-content API `data` into maze instruction overrides for one UI stage.
 */
export function mapStageContentApiToMazeInstructionMap(
  data: StageContentApiData,
  uiStageId: StageId,
): Partial<StageInstructionContentMap> | null {
  const section = data.content_section;
  if (!section?.content?.pages?.length) {
    return null;
  }

  const slides = section.content.pages
    .filter((page) => page.visible_in_app !== false)
    .map((page, index) => mapApiPageToSlide(page, index));

  const gameTitle = section.content.game_title?.trim();
  const idx =
    typeof data.game_index === "number" && Number.isFinite(data.game_index)
      ? data.game_index
      : 1;

  return {
    [uiStageId]: {
      gameLabel: `Game ${idx}`,
      statusLabel: "ACTIVE",
      gameTitle:
        gameTitle && gameTitle.length > 0 ? gameTitle : "Maze Navigation",
      slides,
    },
  };
}
