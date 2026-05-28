import axios from "axios";

const DEFAULT_MAX_CONNECTION_RETRIES = 3;
const DEFAULT_RETRY_INTERVAL_MS = 1000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export function isConnectionFailure(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return !error.response;
  }

  return error instanceof TypeError;
}

export async function retryOnConnectionFailure<T>(
  run: () => Promise<T>,
  maxRetries = DEFAULT_MAX_CONNECTION_RETRIES,
  retryIntervalMs = DEFAULT_RETRY_INTERVAL_MS,
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await run();
    } catch (error) {
      if (!isConnectionFailure(error) || attempt >= maxRetries) {
        throw error;
      }

      attempt += 1;
      await wait(retryIntervalMs);
    }
  }
}
