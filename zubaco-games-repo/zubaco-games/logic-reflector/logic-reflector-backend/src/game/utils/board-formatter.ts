interface FormattedCell {
  row: number;
  col: number;
  cellType: number;
  orientation: number;
}

interface FormattedBlock {
  row: number;
  col: number;
  blockType: number;
  orientation: number;
  isFixed: boolean;
}

interface FormattedAvailableBlock {
  blockType: number;
  count: number;
}

export interface FormattedLevel {
  id: string;
  name: string | null;
  gridSize: { x: number; y: number };
  cells: FormattedCell[];
  blocks: FormattedBlock[];
  availableBlocks: FormattedAvailableBlock[];
}

interface BoardRow {
  id: string;
  name: string | null;
  gridX: number;
  gridY: number;
}

interface CellRow {
  row: number;
  col: number;
  cellType: number;
  orientation: number;
  sortOrder: number;
}

interface BlockRow {
  row: number;
  col: number;
  blockType: number;
  orientation: number;
  isFixed: boolean;
  sortOrder: number;
}

interface AvailableBlockRow {
  blockType: number;
  count: number;
}

/**
 * Format a board and its cells/blocks into a GameLevel shape for the client.
 *
 * @param {BoardRow} board - board value.
 * @param {CellRow[]} cells - cell rows value.
 * @param {BlockRow[]} blocks - block rows value.
 * @param {AvailableBlockRow[]} availableBlocks - available block rows value.
 *
 * @returns {FormattedLevel} The formatted level.
 */
export function formatLevel(
  board: BoardRow,
  cells: CellRow[],
  blocks: BlockRow[],
  availableBlocks: AvailableBlockRow[],
): FormattedLevel {
  const sortedCells = [...cells].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedBlocks = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: board.id,
    name: board.name,
    gridSize: { x: board.gridX, y: board.gridY },
    cells: sortedCells.map((c) => ({
      row: c.row,
      col: c.col,
      cellType: c.cellType,
      orientation: c.orientation,
    })),
    blocks: sortedBlocks.map((b) => ({
      row: b.row,
      col: b.col,
      blockType: b.blockType,
      orientation: b.orientation,
      isFixed: b.isFixed,
    })),
    availableBlocks: availableBlocks.map((ab) => ({
      blockType: ab.blockType,
      count: ab.count,
    })),
  };
}
