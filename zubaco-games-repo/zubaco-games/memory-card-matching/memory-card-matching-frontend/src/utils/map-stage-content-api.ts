import {
  INSTRUCTION_ITEM_VARIANTS,
  POINT_TYPE_TO_VARIANT,
  type StageContentApiData,
  type StageContentApiPage,
} from '@/types/stage-content-api';
import type {
  InstructionItemVariant,
  StageInstructionContent,
  StageInstructionContentMap,
} from '@micro-screens/src';

export function isStageContentEnvelope(data: unknown): data is StageContentApiData {
  if (typeof data !== 'object' || data === null) return false;
  const record = data as Record<string, unknown>;
  if (!('content_section' in record)) return false;
  const section = record.content_section;
  return section !== null && typeof section === 'object';
}

function getInstructionItemVariant(pointType?: string | null): InstructionItemVariant {
  const normalized = (pointType ?? '').trim().toLowerCase();
  return POINT_TYPE_TO_VARIANT[normalized] ?? INSTRUCTION_ITEM_VARIANTS.STEP;
}

function mapPage(
  page: StageContentApiPage,
  index: number,
): StageInstructionContent['slides'][number] {
  const variant = getInstructionItemVariant(page.point_type);
  return {
    id: `api-slide-${index}`,
    title: page.title ?? '',
    description: page.description ?? '',
    items:
      page.points?.map((point, pointIndex) => ({
        id: `api-slide-${index}-item-${pointIndex}`,
        title: point.title ?? '',
        description: point.description ?? '',
        variant,
      })) ?? [],
  };
}

export function mapStageContentToInstructionOverride(
  data: StageContentApiData,
): Partial<StageInstructionContent> | null {
  const section = data.content_section;
  if (!section?.content) return null;

  const pages = section.content.pages?.filter((page) => page.visible_in_app !== false) ?? [];
  if (!pages.length) return null;

  const gameIndex =
    typeof data.game_index === 'number' && Number.isFinite(data.game_index) ? data.game_index : 1;
  const cmsGameLabel = section.content.game_label?.trim();

  return {
    gameLabel: cmsGameLabel && cmsGameLabel.length > 0 ? cmsGameLabel : `Game ${gameIndex}`,
    ...(section.content.status_label ? { statusLabel: section.content.status_label } : {}),
    ...(section.content.game_title ? { gameTitle: section.content.game_title } : {}),
    ...(section.content.play_now_button ? { playNowButton: section.content.play_now_button } : {}),
    ...(section.content.learn_how_to_play
      ? { learnHowToPlay: section.content.learn_how_to_play }
      : {}),
    slides: pages.map(mapPage),
  };
}

export function buildStageInstructionOverride(
  data: StageContentApiData,
  stage: number,
): Partial<StageInstructionContentMap> | null {
  const override = mapStageContentToInstructionOverride(data);
  if (!override) return null;
  const result: Partial<StageInstructionContentMap> = {
    [stage]: override,
  };
  return result;
}
