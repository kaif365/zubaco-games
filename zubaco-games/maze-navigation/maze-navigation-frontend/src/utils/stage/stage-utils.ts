import type { StageId } from "@/types/stage-theme";
import { appConfig } from "@app/config/appConfig";

const MIN_STAGE = 1;
const MAX_STAGE = 4;

export function normalizeStageId(value: number): StageId {
  if (!Number.isFinite(value)) {
    return MIN_STAGE;
  }
  return Math.min(MAX_STAGE, Math.max(MIN_STAGE, Math.floor(value))) as StageId;
}

export function getConfiguredUiStageId(): StageId {
  return appConfig.stage.number;
}

export function getConfiguredApiStageId(): string {
  return appConfig.stage.id;
}
