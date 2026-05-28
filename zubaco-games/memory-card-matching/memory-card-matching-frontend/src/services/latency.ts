/**
 * Waits for the specified number of milliseconds to simulate network latency in mock APIs.
 *
 * @param {number} ms - Milliseconds to wait (default 220).
 *
 * @returns {Promise<void>} Resolves after the delay.
 */
export async function simulateLatency(ms = 220): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}
