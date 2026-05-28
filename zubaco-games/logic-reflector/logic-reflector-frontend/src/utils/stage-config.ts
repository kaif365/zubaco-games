import type { StageId } from '@/micro-screens/theme/colors';

const VALID_STAGES = [1, 2, 3, 4, 5, 6, 7] as const;
const DEFAULT_STAGE: StageId = 5;

function isValidStage(n: number): n is StageId {
  return (VALID_STAGES as readonly number[]).includes(n);
}

/**
 * Resolve the active stage number with priority:
 *   1. URL param  ?stage=N   (runtime override — handy for dev/preview)
 *   2. VITE_STAGE_NO         (build-time env var — production config)
 *   3. DEFAULT_STAGE (5)     (safe fallback)
 */
export function resolveStage(): StageId {
  // 1. URL query param
  try {
    const param = new URLSearchParams(globalThis.location?.search ?? '').get('stage');
    if (param !== null) {
      const n = parseInt(param, 10);
      if (isValidStage(n)) return n;
    }
  } catch {
    // non-browser env (SSR / tests) — skip
  }

  // 2. Vite env var
  const envRaw = import.meta.env.VITE_STAGE_NO;
  if (envRaw !== undefined && envRaw !== '') {
    const n = parseInt(String(envRaw), 10);
    if (isValidStage(n)) return n;
  }

  return DEFAULT_STAGE;
}
