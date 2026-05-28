import type { InFlightBlock } from "../game-restate-state.types";

export interface MoveInput {
  row: number;
  col: number;
  blockId: string | null; // InFlightBlock.id hint from the client; used to identify a specific floating block
  blockType: number | null; // null when action === 'remove' (pick up)
  action: "place" | "remove";
  placedAt: Date;
}

export interface MoveResult extends MoveInput {
  success: boolean;
  sessionBlockId: string | null;
}

/**
 * Build a position map from currently placed (non-removed) blocks.
 *
 * @param {InFlightBlock[]} blocks - blocks value.
 * @returns {Map<string, string>} posKey → block id
 */
export function buildBlockPositionMap(
  blocks: InFlightBlock[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const block of blocks) {
    if (block.removedAt === null && block.placedAt !== null) {
      map.set(`${block.row},${block.col}`, block.id);
    }
  }
  return map;
}

/**
 * Replay a batch of moves against current board state.
 *
 * Moveable blocks start on the board or in inventory (placedAt === null).
 * A "move" is two actions:
 *   1. remove (pick up)  → block.removedAt set, block stays in blocks array
 *   2. place  (put down) → find a floating or inventory block, reposition it
 *
 * Server-side guards (all silent failures — success: false):
 *   - Placement on a fixed cell (emitter / target / wall)
 *   - Placement on an already-occupied cell
 *   - No available block of the requested type
 *   - Block count limit exceeded
 *
 * @param {MoveInput[]} moves - move values.
 * @param {InFlightBlock[]} blocks - mutable block state (mutated in place).
 * @param {{ row: number; col: number }[]} cells - fixed board cells used for placement guard.
 * @returns {MoveResult[]} The replay result.
 */
export function replayMoves(
  moves: MoveInput[],
  blocks: InFlightBlock[],
  cells: { row: number; col: number }[],
): MoveResult[] {
  const blockMap = new Map(blocks.map((b) => [b.id, b]));
  const posMap = buildBlockPositionMap(blocks);
  const cellPosSet = new Set(cells.map((c) => `${c.row},${c.col}`));
  const results: MoveResult[] = [];

  for (const move of moves) {
    const posKey = `${move.row},${move.col}`;

    if (move.action === "place") {
      if (move.blockType === null) {
        results.push({ ...move, success: false, sessionBlockId: null });
        continue;
      }

      // Destination must not be a fixed board cell (emitter / target / wall)
      if (cellPosSet.has(posKey)) {
        results.push({ ...move, success: false, sessionBlockId: null });
        continue;
      }

      // Destination must be unoccupied by another block
      if (posMap.has(posKey)) {
        results.push({ ...move, success: false, sessionBlockId: null });
        continue;
      }

      // Find the block to place — match by blockId if provided, otherwise any non-fixed
      // block of this type. Mirrors frontend buildPlacedBlocksFromMoves which directly
      // repositions any block regardless of whether it was explicitly removed first.
      const blockToPlace =
        (move.blockId !== null
          ? blocks.find(
              (b) =>
                b.id === move.blockId &&
                !b.isFixed &&
                b.blockType === move.blockType,
            )
          : undefined) ??
        blocks.find((b) => b.blockType === move.blockType && !b.isFixed);

      if (!blockToPlace) {
        results.push({ ...move, success: false, sessionBlockId: null });
        continue;
      }

      // If the block is already placed somewhere else, enforce count limit only for
      // inventory blocks (net-new placements). Moving an existing block is always allowed.
      const isCurrentlyPlaced =
        blockToPlace.removedAt === null && blockToPlace.placedAt !== null;

      if (!isCurrentlyPlaced) {
        const totalOfType = blocks.filter(
          (b) => b.blockType === move.blockType && !b.isFixed,
        ).length;
        const placedOfType = blocks.filter(
          (b) =>
            b.blockType === move.blockType &&
            !b.isFixed &&
            b.removedAt === null &&
            b.placedAt !== null,
        ).length;
        if (placedOfType >= totalOfType) {
          results.push({ ...move, success: false, sessionBlockId: null });
          continue;
        }
      }

      // Destination must not be occupied by a different block
      const occupantId = posMap.get(posKey);
      if (occupantId && occupantId !== blockToPlace.id) {
        results.push({ ...move, success: false, sessionBlockId: null });
        continue;
      }

      // If moving from another cell, vacate that cell first
      if (isCurrentlyPlaced) {
        posMap.delete(`${blockToPlace.row},${blockToPlace.col}`);
      }

      // Reposition the block to the new cell
      blockToPlace.row = move.row;
      blockToPlace.col = move.col;
      blockToPlace.placedAt = move.placedAt.toISOString();
      blockToPlace.removedAt = null;
      posMap.set(posKey, blockToPlace.id);

      results.push({ ...move, success: true, sessionBlockId: blockToPlace.id });
    } else {
      // action === 'remove' (pick up)
      const existingId = posMap.get(posKey);
      if (!existingId) {
        results.push({ ...move, success: false, sessionBlockId: null });
        continue;
      }

      const block = blockMap.get(existingId);
      if (!block || block.isFixed || block.removedAt !== null) {
        results.push({ ...move, success: false, sessionBlockId: null });
        continue;
      }

      // Pick up — mark as floating (removedAt set, row/col kept for history)
      block.removedAt = move.placedAt.toISOString();
      posMap.delete(posKey);

      results.push({ ...move, success: true, sessionBlockId: existingId });
    }
  }

  return results;
}
