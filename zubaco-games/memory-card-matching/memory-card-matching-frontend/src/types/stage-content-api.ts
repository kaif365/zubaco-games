import type { InstructionItemVariant } from '@micro-screens/src/types/instruction-content';

export type StageContentApiLanguage = 'EN' | 'HI';

export interface StageContentApiPoint {
  title?: string | null;
  description?: string | null;
}

export interface StageContentApiPage {
  title?: string | null;
  description?: string | null;
  point_type?: string | null;
  points?: StageContentApiPoint[] | null;
  visible_in_app?: boolean | null;
}

export interface StageContentApiInnerContent {
  pages?: StageContentApiPage[] | null;
  game_title?: string | null;
  play_now_button?: string | null;
  learn_how_to_play?: string | null;
  game_label?: string | null;
  status_label?: string | null;
}

export interface StageContentApiSection {
  language?: string | null;
  content?: StageContentApiInnerContent | null;
}

export interface StageContentApiData {
  content_section?: StageContentApiSection | null;
  game_index?: number | null;
}

export const INSTRUCTION_ITEM_VARIANTS = {
  RULE: 'rule' as const,
  STEP: 'step' as const,
};

export const POINT_TYPE_TO_VARIANT: Record<string, InstructionItemVariant> = {
  rule: INSTRUCTION_ITEM_VARIANTS.RULE,
  unordered: INSTRUCTION_ITEM_VARIANTS.RULE,
  step: INSTRUCTION_ITEM_VARIANTS.STEP,
  ordered: INSTRUCTION_ITEM_VARIANTS.STEP,
};
