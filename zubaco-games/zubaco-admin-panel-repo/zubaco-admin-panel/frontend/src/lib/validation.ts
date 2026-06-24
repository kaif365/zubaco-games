export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; issues?: ValidationIssue[] };

export function ok<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

export function fail<T = never>(
  message: string,
  issues?: ValidationIssue[],
): ValidationResult<T> {
  return { ok: false, message, issues };
}
