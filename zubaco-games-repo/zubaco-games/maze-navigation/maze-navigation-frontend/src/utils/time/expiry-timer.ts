/** Seconds remaining until `iso` (UTC), floored at 0. */
export function secondsRemainingUntil(iso: string): number {
  const diffMs = Date.parse(iso) - Date.now();
  return Math.max(0, Math.ceil(diffMs / 1000));
}
