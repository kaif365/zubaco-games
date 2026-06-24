import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.SENTRY_DSN || '';

export function initCrashReporting(): void {
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      enabled: !!SENTRY_DSN,
    });
  } catch (error) {
    console.warn('[CrashReporting] init failed:', error);
  }
}

export function captureException(error: unknown): void {
  try {
    Sentry.captureException(error);
  } catch (e) {
    console.warn('[CrashReporting] captureException failed:', e);
  }
}

export function setUser(id: string, email?: string): void {
  try {
    Sentry.setUser({ id, email });
  } catch (error) {
    console.warn('[CrashReporting] setUser failed:', error);
  }
}

export function addBreadcrumb(message: string, category?: string): void {
  try {
    Sentry.addBreadcrumb({
      message,
      category: category || 'app',
      level: 'info',
    });
  } catch (error) {
    console.warn('[CrashReporting] addBreadcrumb failed:', error);
  }
}
