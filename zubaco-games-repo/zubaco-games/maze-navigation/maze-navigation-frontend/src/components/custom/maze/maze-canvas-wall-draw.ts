import {
  MAZE_CELL_SIZE,
  MAZE_WALL_DEPTH,
  MAZE_WALL_THICKNESS,
} from "@/constants/maze";
import type { MazeStagePixiPalette } from "@/theme/maze-stage-palette";
import * as PIXI from "pixi.js";

type WallRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampRect(
  x: number,
  y: number,
  width: number,
  height: number,
  mazeWidth: number,
  mazeHeight: number,
): WallRect {
  const safeX = clamp(x, 0, mazeWidth);
  const safeY = clamp(y, 0, mazeHeight);
  return {
    x: safeX,
    y: safeY,
    width: clamp(width, 0, mazeWidth - safeX),
    height: clamp(height, 0, mazeHeight - safeY),
  };
}

export function drawExtrudedWallRect(
  wallGraphics: PIXI.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  mazeWidth: number,
  mazeHeight: number,
  palette: MazeStagePixiPalette,
  depth: number = MAZE_WALL_DEPTH,
): void {
  const rect = clampRect(x, y, width, height, mazeWidth, mazeHeight);
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const shadowOffset = depth;
  wallGraphics.beginFill(palette.wallShadow, palette.wallShadowAlpha);
  wallGraphics.drawRect(
    rect.x + shadowOffset,
    rect.y + shadowOffset,
    rect.width,
    rect.height,
  );
  wallGraphics.endFill();

  const capWidth = Math.max(1, rect.width - depth);
  const capHeight = Math.max(1, rect.height - depth);

  if (rect.height > depth) {
    wallGraphics.beginFill(palette.wallSideDark);
    wallGraphics.drawRect(
      rect.x,
      rect.y + capHeight,
      rect.width,
      rect.height - capHeight,
    );
    wallGraphics.endFill();
  }

  if (rect.width > depth) {
    wallGraphics.beginFill(palette.wallSide);
    wallGraphics.drawRect(
      rect.x + capWidth,
      rect.y,
      rect.width - capWidth,
      rect.height,
    );
    wallGraphics.endFill();
  }

  wallGraphics.beginFill(palette.wallTop);
  wallGraphics.drawRect(rect.x, rect.y, capWidth, capHeight);
  wallGraphics.endFill();

  wallGraphics.lineStyle(1, palette.wallHighlight, 0.75);
  wallGraphics.moveTo(rect.x, rect.y);
  wallGraphics.lineTo(rect.x + capWidth, rect.y);
  wallGraphics.moveTo(rect.x, rect.y);
  wallGraphics.lineTo(rect.x, rect.y + capHeight);
  wallGraphics.lineStyle(0);
}

export function drawServerGridBoundaryWalls(
  wallGraphics: PIXI.Graphics,
  grid: number[][],
  mazeCols: number,
  mazeRows: number,
  mazeWidth: number,
  mazeHeight: number,
  palette: MazeStagePixiPalette,
): void {
  const cs = MAZE_CELL_SIZE;
  const wallInsetPx = 5;
  const wallPx = Math.max(cs - wallInsetPx * 2, MAZE_WALL_THICKNESS);
  const rects: WallRect[] = [];

  const cellAt = (r: number, c: number): number => {
    if (r < 0 || c < 0 || r >= mazeRows || c >= mazeCols) {
      return -1;
    }
    const v = grid[r]?.[c];
    return v === 0 || v === 1 ? v : -1;
  };

  const pushCenteredRect = (
    centerX: number,
    centerY: number,
    width: number,
    height: number,
  ) => {
    rects.push(
      clampRect(
        centerX - width / 2,
        centerY - height / 2,
        width,
        height,
        mazeWidth,
        mazeHeight,
      ),
    );
  };

  for (let r = 0; r < mazeRows; r += 1) {
    for (let c = 0; c < mazeCols; c += 1) {
      if (cellAt(r, c) !== 1) {
        continue;
      }

      const centerX = c * cs + cs / 2;
      const centerY = r * cs + cs / 2;

      pushCenteredRect(centerX, centerY, wallPx, wallPx);

      if (cellAt(r, c + 1) === 1) {
        pushCenteredRect(centerX + cs / 2, centerY, cs + wallPx, wallPx);
      }

      if (cellAt(r + 1, c) === 1) {
        pushCenteredRect(centerX, centerY + cs / 2, wallPx, cs + wallPx);
      }
    }
  }

  for (const rect of rects) {
    drawExtrudedWallRect(
      wallGraphics,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      mazeWidth,
      mazeHeight,
      palette,
    );
  }
}
