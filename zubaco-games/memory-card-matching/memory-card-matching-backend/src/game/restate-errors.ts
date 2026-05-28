import * as restate from "@restatedev/restate-sdk";

interface TerminalErrorPayload {
  error: string;
  message: string;
  data?: unknown;
}

/**
 * Create a Restate terminal error from the public API error shape.
 *
 * @param {string} error - error value.
 * @param {string} message - message value.
 * @param {number} errorCode - error code value.
 * @param {unknown} data - data value.
 *
 * @returns {restate.TerminalError} The terminal error result.
 */
export function createTerminalError(
  error: string,
  message: string,
  errorCode: number,
  data?: unknown,
): restate.TerminalError {
  const payload: TerminalErrorPayload = { error, message };
  if (data !== undefined) {
    payload.data = data;
  }

  return new restate.TerminalError(JSON.stringify(payload), {
    errorCode,
  });
}

/**
 * Throw a Restate terminal error from the public API error shape.
 *
 * @param {string} error - error value.
 * @param {string} message - message value.
 * @param {number} errorCode - error code value.
 * @param {unknown} data - data value.
 *
 * @returns {never} This function always throws.
 */
export function throwTerminalError(
  error: string,
  message: string,
  errorCode: number,
  data?: unknown,
): never {
  throw createTerminalError(error, message, errorCode, data);
}
