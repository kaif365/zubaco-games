import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type {
  InstructionItem,
  InstructionSlide,
  StageContent,
  StageInstructionContentMap,
} from "@micro-screens/src/types/instruction-content";
import type { StageId } from "@micro-screens/src/types/stage-theme";

import type {
  StageContentData,
  StageContentPage,
} from "@/types/stage-content-api.types";
import { stageContentApi } from "../api/stageContent.api";
import { stageContentKeys } from "../api/stageContent.keys";

function resolveStageNumber(value: string | undefined): StageId {
  const parsed = Number(value);
  return parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4 || parsed === 5 || parsed === 6 || parsed === 7
    ? parsed
    : 1;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapPage(page: StageContentPage): InstructionSlide {
  const variant =
    page.point_type === "ORDERED" ? ("step" as const) : ("rule" as const);
  const items: InstructionItem[] = page.points.map((point) => ({
    id: slugify(point.title),
    title: point.title,
    description: point.description,
    variant,
  }));
  return {
    id: slugify(page.title),
    title: page.title,
    description: page.description,
    items,
  };
}

function mapToStageContent(
  data: StageContentData,
): Partial<StageContent> | null {
  const section = data.content_section;
  if (!section) return null;
  const slides = section.content.pages
    .filter((p) => p.visible_in_app !== false)
    .map(mapPage);
  if (slides.length === 0) return null;
  return {
    ...(section.content.game_title
      ? { gameTitle: section.content.game_title }
      : {}),
    ...(section.content.play_now_button
      ? { playNowButton: section.content.play_now_button }
      : {}),
    ...(section.content.learn_how_to_play
      ? { learnHowToPlay: section.content.learn_how_to_play }
      : {}),
    slides,
  };
}

function buildContentByStage(
  stageNumber: StageId,
  content: Partial<StageContent>,
): Partial<StageInstructionContentMap> {
  const result: Partial<StageInstructionContentMap> = {};
  result[stageNumber] = content as StageContent;
  return result;
}

export interface UseStageContentResult {
  contentByStage: Partial<StageInstructionContentMap> | undefined;
  isLoading: boolean;
}

export function useStageContent(): UseStageContentResult {
  const { i18n } = useTranslation();
  const stageId = import.meta.env.VITE_STAGE_ID as string | undefined;
  const stageNumber = resolveStageNumber(
    import.meta.env.VITE_STAGE_NUMBER as string | undefined,
  );
  const adminBaseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL as
    | string
    | undefined;
  const lang = i18n.language.toUpperCase() === "HI" ? "HI" : "EN";

  const shouldFetch = Boolean(adminBaseUrl) && Boolean(stageId);

  const { data, isLoading } = useQuery({
    queryKey: stageContentKeys.byStage(stageId ?? "", lang),
    queryFn: () =>
      stageContentApi.getStageContent(adminBaseUrl ?? "", stageId ?? "", lang),
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!data) {
    return { contentByStage: undefined, isLoading: shouldFetch && isLoading };
  }

  const mapped = mapToStageContent(data);
  if (!mapped) {
    return { contentByStage: undefined, isLoading: false };
  }

  return {
    contentByStage: buildContentByStage(stageNumber, mapped),
    isLoading: false,
  };
}
