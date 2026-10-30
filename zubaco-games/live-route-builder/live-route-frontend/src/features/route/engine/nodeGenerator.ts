import { mulberry32 } from './random';
import type { NodePoint, GameConfig } from '../../../types/game';

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
  // Greedy nearest-neighbor for optimal path estimate
  if (nodes.length < 2) return 0;
  let total = 0;
  const visited = new Set<number>([nodes[0].id]);
  let currentNode = nodes[0];
  while (visited.size < nodes.length) {
    let minDist = Infinity;
    let nearestNode: NodePoint | null = null;
    for (const node of nodes) {
      if (visited.has(node.id)) continue;
      const dx = currentNode.x - node.x;
      const dy = currentNode.y - node.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) {
        minDist = d;
        nearestNode = node;
      }
    }
    if (!nearestNode) break;
    total += minDist;
    visited.add(nearestNode.id);
    currentNode = nearestNode;
  }
  return total;
}

export function calculateActualPath(nodes: NodePoint[], edges: { from: number; to: number }[]): number {
  let total = 0;
  const nodeMap = new Map<number, NodePoint>(nodes.map((n) => [n.id, n]));
  for (const e of edges) {
    const a = nodeMap.get(e.from);
    const b = nodeMap.get(e.to);
    if (!a || !b) continue;
    total += Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
  return total;
}
