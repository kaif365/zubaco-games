/** Active stage id from deployment env only (no URL or config fallback). */
export function getEnvStageId(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_DEFAULT_STAGE_ID?.trim();
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return null;
}
