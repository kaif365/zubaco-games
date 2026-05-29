import type { BlockFillPairInput } from '../../game/utils/block-fill-helpers';

export interface BoardNodePoint {
    row: number;
    col: number;
}

export interface BoardNodeInput {
    colorCode?: string;
    color?: string | number;
    points: [BoardNodePoint, BoardNodePoint] | BoardNodePoint[];
}

export interface BlockFillBoardShape {
    name: string;
    difficulty?: string;
    gridRow: number;
    gridCol: number;
    nodes: BoardNodeInput[];
}

export interface SharedBoardDefinition {
    name: string;
    levelId: string;
    gridRow: number;
    gridCol: number;
    nodes: BoardNodeInput[];
}

const COLOR_NAME_TO_VALUE: Record<string, number> = {
    blue: 0x3399ff,
    red: 0xff6666,
    green: 0x66e666,
    yellow: 0xffcc33,
    amber: 0xffbf00,
    purple: 0x9966ff,
    cyan: 0x33cccc,
    pink: 0xff66cc,
    violet: 0x8f00ff,
    mint: 0x98ff98,
    orange: 0xff9933,
    rose: 0xff007f,
    indigo: 0x4b0082,
    teal: 0x008080,
    gold: 0xffd700,
};

const COLOR_VALUE_TO_NAME = new Map<number, string>(
    Object.entries(COLOR_NAME_TO_VALUE).map(([name, value]) => [value, name]),
);

export function normalizeColorCode(colorCode: string): string {
    return String(colorCode ?? '')
        .trim()
        .toLowerCase();
}

/**
 * Converts a color code or color name into the stored numeric representation.
 * @param {string} colorCode - The incoming color value.
 * @returns {number} The numeric storage value for the color.
 */
export function colorCodeToStorageValue(colorCode: string): number {
    const normalized = normalizeColorCode(colorCode);
    const named = COLOR_NAME_TO_VALUE[normalized];
    if (named !== undefined) {
        return named;
    }

    if (/^\d+$/.test(normalized)) {
        return Number.parseInt(normalized, 10);
    }

    if (/^0x[0-9a-f]{6}$/i.test(normalized)) {
        return Number.parseInt(normalized.slice(2), 16);
    }

    if (/^#?[0-9a-f]{6}$/i.test(normalized)) {
        return Number.parseInt(normalized.replace('#', ''), 16);
    }

    // 8-digit hex (RRGGBBAA) — strip alpha channel
    if (/^#?[0-9a-f]{8}$/i.test(normalized)) {
        return Number.parseInt(normalized.replace('#', '').slice(0, 6), 16);
    }

    const rgbMatch = normalized.match(
        /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/,
    );
    if (rgbMatch) {
        const [red, green, blue] = rgbMatch.slice(1, 4).map((value) => Number.parseInt(value, 10));
        if ([red, green, blue].every((value) => value >= 0 && value <= 255)) {
            return (red << 16) | (green << 8) | blue;
        }
    }

    throw new Error(`Unsupported color code: ${colorCode}`);
}

/**
 * Converts a stored numeric color into the public color-code string.
 * @param {number} color - The stored numeric color value.
 * @returns {string} The normalized color string.
 */
export function storageValueToColorCode(color: number): string {
    return COLOR_VALUE_TO_NAME.get(color) ?? `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;
}

/**
 * Resolves the effective color for a board node.
 * @param {BoardNodeInput} node - The board node containing raw color information.
 * @returns {string} The normalized color string for the node.
 */
function resolveBoardNodeColor(node: BoardNodeInput): string {
    const rawColor = node.colorCode ?? node.color;
    return storageValueToColorCode(colorCodeToStorageValue(String(rawColor ?? '')));
}

/**
 * Checks whether a value represents the legacy pair storage format.
 * @param {unknown} value - The raw persisted board pairs value.
 * @returns {boolean} Whether the value is the legacy pair format.
 */
function isLegacyPairs(value: unknown): value is BlockFillPairInput[] {
    return Array.isArray(value);
}

/**
 * Checks whether a value represents the structured board-shape format.
 * @param {unknown} value - The raw persisted board pairs value.
 * @returns {boolean} Whether the value is a board-shape object.
 */
function isBoardShape(value: unknown): value is BlockFillBoardShape {
    return (
        typeof value === 'object' &&
        value !== null &&
        'gridRow' in value &&
        'gridCol' in value &&
        'nodes' in value &&
        Array.isArray((value as { nodes?: unknown[] }).nodes)
    );
}

/**
 * Extracts block-fill endpoint pairs from a board-shape definition.
 * @param {BlockFillBoardShape} board - The board-shape definition.
 * @returns {BlockFillPairInput[]} The derived pair list.
 */
export function extractPairsFromBoardShape(board: BlockFillBoardShape): BlockFillPairInput[] {
    return board.nodes.map((node) => {
        const [start, end] = node.points;
        return {
            color: normalizeColorCode(resolveBoardNodeColor(node)),
            start: { x: start.col, y: start.row },
            end: { x: end.col, y: end.row },
        };
    });
}

/**
 * Converts persisted board data into the public board-shape format.
 * @param {{ name: string | null; gridX: number; gridY: number; rawPairs: unknown; }} options - The raw board conversion options.
 * @returns {BlockFillBoardShape} The normalized board-shape object.
 */
export function toBoardShape(options: {
    name: string | null;
    gridX: number;
    gridY: number;
    rawPairs: unknown;
}): BlockFillBoardShape {
    const { name, gridX, gridY, rawPairs } = options;

    if (isBoardShape(rawPairs)) {
        return {
            name: rawPairs.name ?? name ?? 'Untitled Board',
            difficulty: rawPairs.difficulty,
            gridRow: rawPairs.gridRow,
            gridCol: rawPairs.gridCol,
            nodes: rawPairs.nodes.map((node) => ({
                colorCode: resolveBoardNodeColor(node),
                points: node.points.map((point) => ({ row: point.row, col: point.col })),
            })),
        };
    }

    const pairs = isLegacyPairs(rawPairs) ? rawPairs : [];

    return {
        name: name ?? 'Untitled Board',
        difficulty: undefined,
        gridRow: gridY,
        gridCol: gridX,
        nodes: pairs.map((pair) => ({
            colorCode: storageValueToColorCode(colorCodeToStorageValue(pair.color)),
            points: [
                { row: pair.start.y, col: pair.start.x },
                { row: pair.end.y, col: pair.end.x },
            ],
        })),
    };
}

/**
 * Normalizes a board shape into the persisted storage format.
 * @param {BlockFillBoardShape} board - The board-shape object to normalize.
 * @returns {BlockFillBoardShape} The storage-ready board-shape object.
 */
export function toStoredBoardShape(board: BlockFillBoardShape): BlockFillBoardShape {
    return {
        name: board.name,
        difficulty: board.difficulty,
        gridRow: board.gridRow,
        gridCol: board.gridCol,
        nodes: board.nodes.map((node) => ({
            colorCode: resolveBoardNodeColor(node),
            points: node.points.map((point) => ({ row: point.row, col: point.col })),
        })),
    };
}

/**
 * Formats the shared board payload returned by admin APIs.
 * @param {{ levelId: string; boardShape: BlockFillBoardShape; }} options - The board formatting options.
 * @returns {SharedBoardDefinition} The shared board definition payload.
 */
export function formatSharedBoardDefinition(options: {
    levelId: string;
    boardShape: BlockFillBoardShape;
}): SharedBoardDefinition {
    const { levelId, boardShape } = options;

    return {
        name: boardShape.name,
        levelId,
        gridRow: boardShape.gridRow,
        gridCol: boardShape.gridCol,
        nodes: boardShape.nodes.map((node) => ({
            colorCode: resolveBoardNodeColor(node),
            points: node.points.map((point) => ({ row: point.row, col: point.col })),
        })),
    };
}
