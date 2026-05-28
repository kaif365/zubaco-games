export function generateDemoSequence(length: number, tileCount: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * tileCount) + 1);
}
