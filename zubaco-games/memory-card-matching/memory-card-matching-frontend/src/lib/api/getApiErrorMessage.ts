export function isApiErrorCode(err: unknown, code: string): boolean {
  if (!(err instanceof Error)) return false;
  return err.message === code;
}

export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
