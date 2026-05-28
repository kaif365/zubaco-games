import { ApiRequestError } from '@/types/api.types';

export function isApiErrorCode(err: unknown, code: string): boolean {
  if (!(err instanceof ApiRequestError)) return false;
  return err.message === code || err.code === code;
}

export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
