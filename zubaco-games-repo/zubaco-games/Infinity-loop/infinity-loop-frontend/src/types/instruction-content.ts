import type { InstructionContentPayload } from "./instruction-api";
import type { StageId } from "./stage-theme";

export type {
  InstructionApiLanguage,
  InstructionContentPayload,
  InstructionPage,
  InstructionPoint,
  InstructionPointType,
} from "./instruction-api";

export type StageInstructionContent = InstructionContentPayload;

export type StageInstructionContentMap = Record<
  StageId,
  InstructionContentPayload
>;
