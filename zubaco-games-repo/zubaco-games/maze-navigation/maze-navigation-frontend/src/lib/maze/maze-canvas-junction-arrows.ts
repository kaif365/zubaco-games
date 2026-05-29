import { MAZE_CELL_SIZE } from "@/constants/maze";
import { getDirectionVector } from "@/lib/maze/maze-gen";
import type { MazeStagePixiPalette } from "@/theme/maze-stage-palette";
import { Direction, type MazeCell } from "@/types/maze";
import { gsap } from "gsap";
import * as PIXI from "pixi.js";

export function clearJunctionArrows(layer: PIXI.Container): void {
  for (const child of layer.children) {
    gsap.killTweensOf(child);
  }
  layer.removeChildren();
}

export function drawJunctionArrows(
  junctionLayer: PIXI.Container,
  row: MazeCell[],
  x: number,
  y: number,
  palette: MazeStagePixiPalette,
): void {
  const currentCell = row[x];
  if (!currentCell) {
    return;
  }

  clearJunctionArrows(junctionLayer);

  for (const direction of [
    Direction.UP,
    Direction.DOWN,
    Direction.LEFT,
    Direction.RIGHT,
  ]) {
    if (!(currentCell.walls & direction)) {
      continue;
    }

    const { dx, dy } = getDirectionVector(direction);
    const arrow = new PIXI.Graphics();
    const arrowX = (x + dx) * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2;
    const arrowY = (y + dy) * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2;
    const size = 6;

    arrow.beginFill(palette.wallTop, 0.55);
    if (direction === Direction.UP) {
      arrow.drawPolygon([0, -size, -size, size, size, size]);
    }
    if (direction === Direction.DOWN) {
      arrow.drawPolygon([0, size, -size, -size, size, -size]);
    }
    if (direction === Direction.LEFT) {
      arrow.drawPolygon([-size, 0, size, -size, size, size]);
    }
    if (direction === Direction.RIGHT) {
      arrow.drawPolygon([size, 0, -size, -size, -size, size]);
    }
    arrow.endFill();

    arrow.x = arrowX;
    arrow.y = arrowY;
    junctionLayer.addChild(arrow);

    gsap.to(arrow, {
      alpha: 0.2,
      duration: 0.5,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });
  }
}
