export async function simulateLatency(ms = 220): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}
