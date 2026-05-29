import type {
  InstructionApiLanguage,
  InstructionContentPayload,
  InstructionPage,
} from "@/types/instruction-api";
import type {
  StageContentApiData,
  StageContentApiPage,
} from "@/types/stage-content-api";

export function isStageContentEnvelope(
  data: unknown,
): data is StageContentApiData {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  if (!("content_section" in record)) return false;
  const section = record.content_section;
  return section !== null && typeof section === "object";
}

function normalizeInstructionLanguage(
  raw: string,
): InstructionApiLanguage | undefined {
  const upper = raw.trim().toUpperCase();
  if (upper === "EN" || upper === "HI") return upper;
  return undefined;
}

function mapApiPage(page: StageContentApiPage): InstructionPage {
  return {
    title: page.title,
    description: page.description,
    pointType: page.point_type,
    points: page.points.map((p) => ({
      title: p.title,
      description: p.description,
    })),
  };
}

/**
 * Maps stage-content API `data` into instruction screen overrides.
 * `game_index` drives the top meta label (`GAME 1`, `GAME 2`, …); invalid/missing → `GAME 1`.
 */
export function mapStageContentToInstructionOverride(
  data: StageContentApiData,
): Partial<InstructionContentPayload> | null {
  const section = data.content_section;
  if (!section?.content) return null;

  const hasValidGameIndex =
    typeof data.game_index === "number" &&
    Number.isFinite(data.game_index) &&
    data.game_index >= 1;

  const lang = normalizeInstructionLanguage(section.language);

  const pages = section.content.pages
    .filter((p) => p.visible_in_app !== false)
    .map(mapApiPage);

  const cmsTitle = section.content.game_title?.trim();
  const cmsTagline = section.content.game_tagline?.trim();

  return {
    gameLabel: hasValidGameIndex ? `GAME ${data.game_index}` : "GAME 1",
    pages,
    playNowButton: section.content.play_now_button,
    learnHowToPlay: section.content.learn_how_to_play,
    ...(lang ? { language: lang } : {}),
    ...(cmsTitle ? { gameTitle: cmsTitle } : {}),
    ...(cmsTagline ? { headerTagline: cmsTagline } : {}),
  } satisfies Partial<InstructionContentPayload>;
}
