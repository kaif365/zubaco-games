import { MAZE_CELL_SIZE } from "@/constants/maze";
import type { MazeStagePixiPalette } from "@/theme/maze-stage-palette";
import * as PIXI from "pixi.js";

export function drawCheckerFloor(
  floorGraphics: PIXI.Graphics,
  mazeCols: number,
  mazeRows: number,
  palette: MazeStagePixiPalette,
): void {
  for (let r = 0; r < mazeRows; r += 1) {
    for (let c = 0; c < mazeCols; c += 1) {
      const isAlt = (r + c) % 2 === 1;
      floorGraphics.beginFill(isAlt ? palette.floorAlt : palette.floor);
      floorGraphics.drawRect(
        c * MAZE_CELL_SIZE,
        r * MAZE_CELL_SIZE,
        MAZE_CELL_SIZE,
        MAZE_CELL_SIZE,
      );
      floorGraphics.endFill();
    }
  }
}
