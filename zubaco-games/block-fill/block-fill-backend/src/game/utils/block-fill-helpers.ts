export interface GridPoint {
    x: number;
    y: number;
}

export interface BlockFillPairInput {
    color: string;
    start: GridPoint;
    end: GridPoint;
}

export interface BlockFillSavedPath {
    color: string;
    path: GridPoint[];
}

export function pointKey(x: number, y: number): string {
    return `${x},${y}`;
}

export function isPointInsideGrid(point: GridPoint, gridX: number, gridY: number): boolean {
    return point.x >= 0 && point.x < gridX && point.y >= 0 && point.y < gridY;
}

export function isAdjacent(from: GridPoint, to: GridPoint): boolean {
    return Math.abs(from.x - to.x) + Math.abs(from.y - to.y) === 1;
}

export function endpointsMatch(path: GridPoint[], start: GridPoint, end: GridPoint): boolean {
    if (path.length < 2) {
        return false;
    }

    const first = path[0];
    const last = path[path.length - 1];

    return (
        (first.x === start.x && first.y === start.y && last.x === end.x && last.y === end.y) ||
        (first.x === end.x && first.y === end.y && last.x === start.x && last.y === start.y)
    );
}

export function samePoint(a: GridPoint, b: GridPoint): boolean {
    return a.x === b.x && a.y === b.y;
}

export function pathTouchesEndpoint(path: GridPoint[], endpoint: GridPoint): boolean {
    return path.some((point) => samePoint(point, endpoint));
}

export function clonePoint(point: GridPoint): GridPoint {
    return { x: point.x, y: point.y };
}
