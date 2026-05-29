import { appEnv } from '@/app/config/env';

import type { StageId } from '@/constants/stageTheme';

/** Resolves `VITE_USER_STAGE_NUMBER` to a valid block-fill stage id (1–7). */
export function resolveUserStageNumber(): StageId {
  const parsed = Number(appEnv.userStageNumber);
  return (parsed >= 1 && parsed <= 7 ? parsed : 1) as StageId;
}
