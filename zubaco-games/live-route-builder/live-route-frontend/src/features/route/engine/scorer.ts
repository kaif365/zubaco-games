export function calculateScore(pathEfficiency: number, nodesConnected: number): number {
  const pathScore = Math.round(pathEfficiency);
  const nodeScore = nodesConnected * 10;
  return pathScore + nodeScore;
}
