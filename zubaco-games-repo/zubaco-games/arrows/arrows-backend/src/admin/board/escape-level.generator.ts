const DIRECTIONS = {
    up: { dx: 0, dy: 1 },
    down: { dx: 0, dy: -1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
} as const;

const COLORS = [
    0x3399ff, 0xff6666, 0x66e666, 0xffcc33, 0xcc66ff, 0xff9933, 0x33e5e5, 0xff80cc, 0x99ff33,
    0xff3399,
];

type Direction = keyof typeof DIRECTIONS;
type Cell = [number, number];
type Piece = { cells: Cell[]; headDirection: Direction };

export type GeneratedArrow = {
    waypoints: { x: number; y: number }[];
    headDirection: Direction;
    color: number;
};

const cellKey = ([x, y]: Cell): string => `${x},${y}`;
const parseCellKey = (key: string): Cell => key.split(',').map(Number) as Cell;

function shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

function randomInt(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function isAdjacent(a: Cell, b: Cell): boolean {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

function directionFromPair(tail: Cell, head: Cell): Direction {
    const dx = head[0] - tail[0];
    const dy = head[1] - tail[1];
    if (dx === 0 && dy === 1) {
        return 'up';
    }
    if (dx === 0 && dy === -1) {
        return 'down';
    }
    if (dx === -1 && dy === 0) {
        return 'left';
    }
    return 'right';
}

function isPathClear(
    head: Cell,
    occupied: Set<string>,
    width: number,
    height: number,
    direction: Direction,
): boolean {
    const { dx, dy } = DIRECTIONS[direction];
    let x = head[0] + dx;
    let y = head[1] + dy;

    while (x >= 0 && x < width && y >= 0 && y < height) {
        if (occupied.has(`${x},${y}`)) {
            return false;
        }
        x += dx;
        y += dy;
    }

    return true;
}

function partitionGrid(cellsSet: Set<string>, minLen: number, maxLen: number): Cell[][] {
    const assigned = new Map<string, number>();
    const snakes: (Cell[] | null)[] = [];
    const order = shuffle([...cellsSet]);

    for (const startKey of order) {
        if (assigned.has(startKey)) {
            continue;
        }

        const target = randomInt(minLen, maxLen);
        const cells = [parseCellKey(startKey)];
        const sid = snakes.length;
        assigned.set(startKey, sid);

        let lastDirection: Cell = [0, 0];
        for (let i = 0; i < target - 1; i++) {
            const [cx, cy] = cells[cells.length - 1];
            let dirs: Cell[] = shuffle([
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ]);

            if ((lastDirection[0] !== 0 || lastDirection[1] !== 0) && Math.random() < 0.55) {
                dirs = [
                    ...dirs.filter(
                        (dir) => dir[0] !== lastDirection[0] || dir[1] !== lastDirection[1],
                    ),
                    lastDirection,
                ];
            }

            const next = dirs
                .map(([dx, dy]) => [cx + dx, cy + dy] as Cell)
                .find((cell) => cellsSet.has(cellKey(cell)) && !assigned.has(cellKey(cell)));
            if (!next) {
                break;
            }

            cells.push(next);
            assigned.set(cellKey(next), sid);
            lastDirection = [next[0] - cx, next[1] - cy];
        }

        snakes.push(cells);
    }

    let changed = true;
    while (changed) {
        changed = false;
        for (let i = snakes.length - 1; i >= 0; i--) {
            const small = snakes[i];
            if (!small || small.length >= 2) {
                continue;
            }

            for (let j = 0; j < snakes.length; j++) {
                if (i === j || !snakes[j]) {
                    continue;
                }
                const target = snakes[j]!;
                let merged = false;

                if (isAdjacent(target[target.length - 1], small[0])) {
                    target.push(...small);
                    merged = true;
                } else if (isAdjacent(small[small.length - 1], target[0])) {
                    target.unshift(...small.slice().reverse());
                    merged = true;
                } else if (isAdjacent(target[target.length - 1], small[small.length - 1])) {
                    target.push(...small.slice().reverse());
                    merged = true;
                } else if (isAdjacent(small[0], target[0])) {
                    target.unshift(...small);
                    merged = true;
                }

                if (merged) {
                    for (const cell of small) {
                        assigned.set(cellKey(cell), j);
                    }
                    snakes[i] = null;
                    changed = true;
                    break;
                }
            }
        }
    }

    changed = true;
    while (changed) {
        changed = false;
        for (let i = snakes.length - 1; i >= 0; i--) {
            const small = snakes[i];
            if (!small || small.length >= 2) {
                continue;
            }
            const isolated = small[0];

            for (let j = 0; j < snakes.length; j++) {
                const target = snakes[j];
                if (i === j || !target || target.length < 3) {
                    continue;
                }

                for (let k = 0; k < target.length; k++) {
                    if (!isAdjacent(isolated, target[k])) {
                        continue;
                    }

                    const right = [isolated, ...target.slice(k)];
                    const left = target.slice(0, k);
                    if (left.length >= 2) {
                        snakes[j] = left;
                        snakes.push(right);
                        snakes[i] = null;
                        changed = true;
                        break;
                    }

                    const withIsolated = [...target.slice(0, k + 1), isolated];
                    const rest = target.slice(k + 1);
                    if (rest.length >= 2) {
                        snakes[j] = withIsolated;
                        snakes.push(rest);
                        snakes[i] = null;
                        changed = true;
                        break;
                    }

                    if (k === 0) {
                        snakes[j] = [isolated, ...target];
                        snakes[i] = null;
                        changed = true;
                        break;
                    }
                }

                if (snakes[i] === null) {
                    break;
                }
            }
        }
    }

    return snakes.filter((snake): snake is Cell[] => snake !== null);
}

function escapableCandidates(
    snakes: Cell[][],
    solved: Set<number>,
    occupied: Set<string>,
    width: number,
    height: number,
): { idx: number; cells: Cell[]; direction: Direction }[] {
    const candidates: { idx: number; cells: Cell[]; direction: Direction }[] = [];

    for (let i = 0; i < snakes.length; i++) {
        if (solved.has(i)) {
            continue;
        }

        const cells = snakes[i];
        for (const orientedCells of [cells, cells.slice().reverse()]) {
            const direction =
                orientedCells.length === 1
                    ? (Object.keys(DIRECTIONS) as Direction[]).find((dir) =>
                          isPathClear(orientedCells[0], occupied, width, height, dir),
                      )
                    : directionFromPair(
                          orientedCells[orientedCells.length - 2],
                          orientedCells[orientedCells.length - 1],
                      );

            if (
                direction &&
                isPathClear(
                    orientedCells[orientedCells.length - 1],
                    occupied,
                    width,
                    height,
                    direction,
                )
            ) {
                candidates.push({ idx: i, cells: orientedCells, direction });
            }
        }
    }

    return candidates;
}

function orientSnakes(snakes: Cell[][], width: number, height: number): Piece[] | null {
    const solutionOrder: Piece[] = [];
    const maxNodes = 80;
    let nodes = 0;

    const backtrack = (solved: Set<number>, occupied: Set<string>): boolean => {
        if (solved.size === snakes.length) {
            return true;
        }
        if (nodes >= maxNodes) {
            return false;
        }

        const candidates = shuffle(escapableCandidates(snakes, solved, occupied, width, height));
        if (candidates.length === 0) {
            nodes++;
            return false;
        }

        for (const candidate of candidates) {
            const piece = {
                cells: candidate.cells,
                headDirection: candidate.direction,
            };
            solved.add(candidate.idx);
            solutionOrder.push(piece);
            nodes++;

            const nextOccupied = new Set(occupied);
            for (const cell of candidate.cells) {
                nextOccupied.delete(cellKey(cell));
            }

            if (backtrack(solved, nextOccupied)) {
                return true;
            }

            solved.delete(candidate.idx);
            solutionOrder.pop();
            if (nodes >= maxNodes) {
                return false;
            }
        }

        return false;
    };

    const occupied = new Set(snakes.flatMap((snake) => snake.map(cellKey)));
    if (!backtrack(new Set(), occupied)) {
        return null;
    }

    return solutionOrder;
}

function scorePieces(pieces: Piece[], width: number, height: number): number {
    const occupied = new Set(pieces.flatMap((piece) => piece.cells.map(cellKey)));
    const moveCounts: number[] = [];

    for (const piece of pieces) {
        const movable = pieces.filter((candidate) => {
            if (candidate === piece) {
                return false;
            }
            return isPathClear(
                candidate.cells[candidate.cells.length - 1],
                occupied,
                width,
                height,
                candidate.headDirection,
            );
        }).length;
        moveCounts.push(movable);
        for (const cell of piece.cells) {
            occupied.delete(cellKey(cell));
        }
    }

    const occupiedCount = pieces.reduce((sum, piece) => sum + piece.cells.length, 0);
    const averageMoves = moveCounts.reduce((sum, count) => sum + count, 0) / moveCounts.length;
    return pieces.length * 5 + occupiedCount - averageMoves * 14;
}

export function generateEscapeLevel(gridX: number, gridY: number): GeneratedArrow[] | null {
    const playable = new Set<string>();
    for (let x = 0; x < gridX; x++) {
        for (let y = 0; y < gridY; y++) {
            playable.add(`${x},${y}`);
        }
    }

    const minLen = 3;
    const maxLen = Math.max(minLen, Math.min(10, gridX * gridY));
    let best: Piece[] | null = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 3000; attempt++) {
        const snakes = partitionGrid(playable, minLen, maxLen);
        if (snakes.some((snake) => snake.length < 2)) {
            continue;
        }

        const oriented = orientSnakes(snakes, gridX, gridY);
        if (!oriented) {
            continue;
        }

        const score = scorePieces(oriented, gridX, gridY);
        if (score > bestScore) {
            best = oriented;
            bestScore = score;
        }

        const occupiedCount = oriented.reduce((sum, piece) => sum + piece.cells.length, 0);
        const fillRatio = occupiedCount / (gridX * gridY);
        if (fillRatio >= 0.98) {
            break;
        }
    }

    return (
        best?.map((piece, index) => ({
            waypoints: piece.cells.map(([x, y]) => ({ x, y })),
            headDirection: piece.headDirection,
            color: COLORS[index % COLORS.length],
        })) ?? null
    );
}
