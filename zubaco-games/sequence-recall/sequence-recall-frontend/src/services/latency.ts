/**
 * Simulate latency.
 *
 * @param {number} ms - The ms.
 *
 * @returns {Promise<void>} A promise that resolves when the operation completes.
 */
export async function simulateLatency(ms = 220): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
