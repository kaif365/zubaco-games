/**
 * Waits for approximately the given duration (for dev/test simulation).
 *
 * @param {number} [ms=220] - Delay in milliseconds.
 *
 * @returns {Promise<void>} A promise that resolves after the delay.
 */
export async function simulateLatency(ms = 220): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
