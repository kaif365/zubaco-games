import {
  generateNodes,
  calculateOptimalPath,
  calculateActualPath,
  GameConfig,
} from '../nodeGenerator';

describe('Live Route Builder — Solvability & Path Audit', () => {
  const config: GameConfig = {
    nodeIntervalMs: 1500,
    totalNodes: 10,
    timeLimitMs: 45000,
    canvasWidth: 800,
    canvasHeight: 600,
  };

  it('generates all nodes within valid canvas margins with monotonic appearance intervals', () => {
    const margin = 40;
    const nodes = generateNodes(12345, config);

    expect(nodes.length).toBe(config.totalNodes);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      expect(node.id).toBe(i);
      expect(node.x).toBeGreaterThanOrEqual(margin);
      expect(node.x).toBeLessThanOrEqual(config.canvasWidth - margin);
      expect(node.y).toBeGreaterThanOrEqual(margin);
      expect(node.y).toBeLessThanOrEqual(config.canvasHeight - margin);
      expect(node.appearedAt).toBe(i * config.nodeIntervalMs);
    }
  });

  it('guarantees deterministic node placement for identical seeds', () => {
    const nodesA = generateNodes(54321, config);
    const nodesB = generateNodes(54321, config);
    const nodesC = generateNodes(99999, config);

    expect(nodesA).toEqual(nodesB);
    expect(nodesA[0]!.x).not.toBe(nodesC[0]!.x);
  });

  it('calculates optimal path length and verifies 100% efficiency on optimal traversal', () => {
    // Generate simple collinear points for exact analytical distance verification
    const nodes = [
      { id: 0, x: 100, y: 100, appearedAt: 0 },
      { id: 1, x: 200, y: 100, appearedAt: 1000 },
      { id: 2, x: 300, y: 100, appearedAt: 2000 },
    ];

    const optimal = calculateOptimalPath(nodes);
    expect(optimal).toBe(200); // 100 + 100

    const edges = [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ];

    const actual = calculateActualPath(nodes, edges);
    expect(actual).toBe(200);

    const efficiency = (optimal / actual) * 100;
    expect(efficiency).toBe(100);
  });

  it('penalizes inefficient zig-zagging routes with lower path efficiency', () => {
    const nodes = [
      { id: 0, x: 0, y: 0, appearedAt: 0 },
      { id: 1, x: 100, y: 0, appearedAt: 1000 },
      { id: 2, x: 200, y: 0, appearedAt: 2000 },
    ];

    const optimal = calculateOptimalPath(nodes); // 0 -> 1 -> 2: length 200

    // Zig-zag: 0 -> 2 (200), then 2 -> 1 (100) = 300 total
    const inefficientEdges = [
      { from: 0, to: 2 },
      { from: 2, to: 1 },
    ];

    const actual = calculateActualPath(nodes, inefficientEdges);
    expect(actual).toBe(300);

    const efficiency = (optimal / actual) * 100;
    expect(efficiency).toBeCloseTo(66.67, 1);
  });
});
