import { mulberry32 } from './random';
export interface NodePoint { id: number; x: number; y: number; appearedAt: number; }
export interface GameConfig { nodeIntervalMs: number; totalNodes: number; timeLimitMs: number; canvasWidth: number; canvasHeight: number; }

export function generateNodes(seed: number, config: GameConfig): NodePoint[] {
  const rng = mulberry32(seed);
  const nodes: NodePoint[] = [];
  const margin = 40;
  for (let i = 0; i < config.totalNodes; i++) {
    const x = margin + rng() * (config.canvasWidth - margin * 2);
    const y = margin + rng() * (config.canvasHeight - margin * 2);
    nodes.push({ id: i, x, y, appearedAt: i * config.nodeIntervalMs });
  }
  return nodes;
}

export function calculateOptimalPath(nodes: NodePoint[]): number {
  if (nodes.length < 2) return 0;
  let total = 0;
  const visited = new Set<number>([0]);
  let current = 0;
  while (visited.size < nodes.length) {
    let minDist = Infinity; let nearest = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (visited.has(i)) continue;
      const dx = nodes[current]!.x - nodes[i]!.x;
      const dy = nodes[current]!.y - nodes[i]!.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) { minDist = d; nearest = i; }
    }
    if (nearest === -1) break;
    total += minDist; visited.add(nearest); current = nearest;
  }
  return total;
}

export function calculateActualPath(nodes: NodePoint[], edges: { from: number; to: number }[]): number {
  let total = 0;
  for (const e of edges) {
    const a = nodes[e.from]; const b = nodes[e.to];
    if (!a || !b) continue;
    total += Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
  return total;
}
