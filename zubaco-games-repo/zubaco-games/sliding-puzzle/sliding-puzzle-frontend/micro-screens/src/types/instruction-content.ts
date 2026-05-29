import type { StageId } from "./stage-theme";

export type InstructionItemVariant = "step" | "rule";

export interface InstructionItem {
  id: string;
  title: string;
  description: string;
  variant: InstructionItemVariant;
}

export interface InstructionSlide {
  id: string;
  title: string;
  description: string;
  items: InstructionItem[];
}

export interface StageContent {
  gameLabel: string;
  statusLabel: string;
  gameTitle: string;
  slides: InstructionSlide[];
  /** Backend-configurable label for the primary CTA. Falls back to i18n key when absent. */
  playNowButton?: string;
  /** Backend-configurable label for the secondary CTA. Falls back to i18n key when absent. */
  learnHowToPlay?: string;
}

export type StageContentMap = Record<StageId, StageContent>;

export type StageInstructionContent = StageContent;

export type StageInstructionContentMap = StageContentMap;
