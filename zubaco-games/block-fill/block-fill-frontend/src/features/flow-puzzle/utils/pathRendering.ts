import type { FlowPuzzleLevel, GridCoord } from '@/features/flow-puzzle/types';
import { coordKey, findNodeByColor } from '@/features/flow-puzzle/engine/flowEngine';

export function getCellCenter(coord: GridCoord, cellSize: number) {
  return {
    x: coord.col * cellSize + cellSize / 2,
    y: coord.row * cellSize + cellSize / 2,
  };
}

export function buildSmoothSvgPath(coords: GridCoord[], cellSize: number) {
  if (coords.length === 0) {
    return '';
  }

  const points = coords.map((coord) => getCellCenter(coord, cellSize));
  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x} ${point.y}`;
  }

  if (points.length === 2) {
    const [start, end] = points;
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }

  const penultimate = points[points.length - 2];
  const last = points[points.length - 1];
  path += ` Q ${penultimate.x} ${penultimate.y} ${last.x} ${last.y}`;
  return path;
}

export function getEndpointMap(level: FlowPuzzleLevel) {
  return level.nodes.reduce<Map<string, string>>((accumulator, node) => {
    node.endpoints.forEach((endpoint) => {
      accumulator.set(coordKey(endpoint), node.colorId);
    });
    return accumulator;
  }, new Map());
}

export function getPathColor(level: FlowPuzzleLevel, colorId: string) {
  return findNodeByColor(level, colorId)?.colorHex ?? '#ffffff';
}
