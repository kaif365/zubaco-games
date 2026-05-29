type UnauthorizedRecoveryHandler = () => Promise<void>;

let recoveryHandler: UnauthorizedRecoveryHandler | null = null;
let recoveryInFlight: Promise<void> | null = null;

export function registerUnauthorizedRecovery(
  handler: UnauthorizedRecoveryHandler | null,
): void {
  recoveryHandler = handler;
}

export async function runUnauthorizedRecovery(): Promise<void> {
  if (!recoveryHandler) return;
  if (recoveryInFlight !== null) {
    await recoveryInFlight;
    return;
  }
  recoveryInFlight = recoveryHandler().finally(() => {
    recoveryInFlight = null;
  });
  await recoveryInFlight;
}
