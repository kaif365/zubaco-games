import { captureException } from './crashReporting';

// Wires process-wide JS error reporting into the crash-reporting abstraction.
// Covers two classes of failures RN does not report to Sentry by default:
//   1. Fatal / non-fatal uncaught JS exceptions (ErrorUtils global handler).
//   2. Unhandled promise rejections (RN's bundled rejection-tracking).

let installed = false;

export function installGlobalErrorHandlers(): void {
  if (installed) return;
  installed = true;

  // 1. Uncaught JS exceptions.
  const errorUtils = (global as any).ErrorUtils;
  if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
    const previousHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      try {
        captureException(error);
      } catch {
        // never mask the original crash
      }
      // Preserve RN's default red-box / crash behaviour.
      if (previousHandler) previousHandler(error, isFatal);
    });
  }

  // 2. Unhandled promise rejections.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tracking = require('promise/setimmediate/rejection-tracking');
    tracking.enable({
      allRejections: true,
      onUnhandled: (_id: unknown, error: unknown) => {
        captureException(error);
      },
      onHandled: () => {
        // A previously-unhandled rejection was later handled — nothing to do.
      },
    });
  } catch {
    // Rejection-tracking module unavailable — uncaught-exception handler still active.
  }
}
