export const DEFAULT_LEVEL_ORDER = [
  "easy",
  "medium",
  "hard",
  "extreme hard",
] as const;

export type LevelOrderName = (typeof DEFAULT_LEVEL_ORDER)[number];

export function normalizeLevelName(name: string): string {
  return name.trim().toLowerCase().replace(/[_-]+/g, " ");
}

export function levelOrderIndex(name: string): number {
  const normalized = normalizeLevelName(name);
  const index = DEFAULT_LEVEL_ORDER.indexOf(normalized as LevelOrderName);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

export function compareLevelsByName(aName: string, bName: string): number {
  const aIndex = levelOrderIndex(aName);
  const bIndex = levelOrderIndex(bName);

  if (aIndex !== bIndex) return aIndex - bIndex;

  // Stable deterministic fallback for unknown/custom level names.
  return normalizeLevelName(aName).localeCompare(normalizeLevelName(bName));
}

export function sortLevelsByName<T extends { name: string }>(levels: T[]): T[] {
  return [...levels].sort((a, b) => compareLevelsByName(a.name, b.name));
}
