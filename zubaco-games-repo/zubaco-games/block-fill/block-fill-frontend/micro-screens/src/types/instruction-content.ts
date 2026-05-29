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
}

export type StageContentMap = Record<StageId, StageContent>;

export type StageInstructionContent = StageContent;

export type StageInstructionContentMap = StageContentMap;
