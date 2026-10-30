/* eslint-disable @typescript-eslint/no-var-requires */
let Sentry: any = null;
try {
  Sentry = require('@sentry/react-native');
} catch {
  Sentry = null;
}
/* eslint-enable @typescript-eslint/no-var-requires */

const SENTRY_DSN = process.env.SENTRY_DSN || '';

export function initCrashReporting(): void {
  try {
    if (Sentry && SENTRY_DSN) {
      Sentry.init({
        dsn: SENTRY_DSN,
        enabled: true,
      });
    }
  } catch (error) {
    console.warn('[CrashReporting] init failed:', error);
  }
}

export function captureException(error: unknown): void {
  try {
    if (Sentry?.captureException) {
      Sentry.captureException(error);
    } else {
      console.error('[CrashReporting] captureException:', error);
    }
  } catch (e) {
    console.warn('[CrashReporting] captureException failed:', e);
  }
}

export function setUser(id: string, email?: string): void {
  try {
    if (Sentry?.setUser) {
      Sentry.setUser({ id, email });
    }
  } catch (error) {
    console.warn('[CrashReporting] setUser failed:', error);
  }
}

export function addBreadcrumb(message: string, category?: string): void {
  try {
    if (Sentry?.addBreadcrumb) {
      Sentry.addBreadcrumb({
        message,
        category: category || 'app',
        level: 'info',
      });
    }
  } catch (error) {
    console.warn('[CrashReporting] addBreadcrumb failed:', error);
  }
}
