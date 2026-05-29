import { ApiError } from "@/lib/api/client";

type Violation = {
  levelId?: string;
  available?: number;
  required?: number;
  message?: string;
};

function formatViolation(
  violation: Violation,
  levelNames: Map<string, string>,
): string | null {
  const levelId = typeof violation.levelId === "string" ? violation.levelId : "";
  const levelLabel = levelNames.get(levelId) ?? (levelId ? `Level ${levelId}` : "");
  const available =
    typeof violation.available === "number" ? violation.available : null;
  const required = typeof violation.required === "number" ? violation.required : null;

  if (levelLabel && available !== null && required !== null) {
    return `${levelLabel} has ${available} available boards, but ${required} are required.`;
  }

  if (levelLabel && violation.message) {
    return `${levelLabel}: ${violation.message}`;
  }

  return violation.message ?? (levelLabel || null);
}

export function formatLevelConfigError(
  error: unknown,
  levelNames: Map<string, string>,
): string | null {
  if (!(error instanceof ApiError)) return null;

  const details = (error.details ?? {}) as { violations?: Violation[] };
  const violations = Array.isArray(details.violations) ? details.violations : [];
  if (!violations.length) return null;

  const parts = violations
    .map((violation) => formatViolation(violation, levelNames))
    .filter((entry): entry is string => Boolean(entry));

  const availableLevels = Array.from(new Set(levelNames.values())).join(", ");

  if (!parts.length) {
    return availableLevels
      ? `Available levels: ${availableLevels}.`
      : "Level validation failed.";
  }

  return availableLevels
    ? `${parts.join(" ")} Available levels: ${availableLevels}.`
    : parts.join(" ");
}
