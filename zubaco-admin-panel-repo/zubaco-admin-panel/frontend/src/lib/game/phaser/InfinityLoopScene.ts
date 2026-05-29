import type { InfinityTileCell } from "@/types/games/infinity-loop/infinity-loop-board-editor";
import * as Phaser from "phaser";

export const INFINITY_TILE_RENDER_TYPE = {
  FILLED: "filled",
  OUTLINE: "outline",
} as const;

export type InfinityTileRenderType =
  (typeof INFINITY_TILE_RENDER_TYPE)[keyof typeof INFINITY_TILE_RENDER_TYPE];

export class InfinityLoopScene extends Phaser.Scene {
  private grid: InfinityTileCell[][] = [];
  private previousGridSnapshot: InfinityTileCell[][] = [];
  private shouldAnimateTileEntrance = true;
  private onTileRotate?: (x: number, y: number) => void;
  private tileSprites: Phaser.GameObjects.Container[][] = [];
  private isInputLocked = false;
  private colors = {
    primary: 0x7dd3fc,
    glow: 0x38bdf8,
    bg: 0x03070d,
  };
  private tileType: InfinityTileRenderType = INFINITY_TILE_RENDER_TYPE.OUTLINE;
  private forceMobileViewport = true;

  constructor() {
    super("InfinityLoopScene");
  }

  init(data: {
    grid: InfinityTileCell[][];
    onTileRotate?: (x: number, y: number) => void;
    colors: { primary: string; glow: string; background: string };
    animateTileEntrance?: boolean;
    tileType?: InfinityTileRenderType;
    forceMobileViewport?: boolean;
  }) {
    this.grid = data.grid || [];
    this.onTileRotate = data.onTileRotate;
    this.shouldAnimateTileEntrance = data.animateTileEntrance ?? true;
    if (data.colors) {
      this.colors = {
        primary: this.parseColor(data.colors.primary),
        glow: this.parseColor(data.colors.glow),
        bg: this.parseColor(data.colors.background),
      };
    }
    this.tileType = data.tileType ?? INFINITY_TILE_RENDER_TYPE.OUTLINE;
    this.forceMobileViewport = data.forceMobileViewport ?? true;
  }

  create() {
    this.scale.on("resize", this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize, this);
    });
    this.renderGrid(this.shouldAnimateTileEntrance);
    this.previousGridSnapshot = this.cloneGridSnapshot(this.grid);
  }

  updateGrid(
    newGrid: InfinityTileCell[][],
    colors?: { primary: string; glow: string; background: string },
    onTileRotate?: (x: number, y: number) => void,
    animateTileEntrance?: boolean,
    tileType?: InfinityTileRenderType,
    forceMobileViewport?: boolean,
  ) {
    if (typeof animateTileEntrance === "boolean") {
      this.shouldAnimateTileEntrance = animateTileEntrance;
    }
    const shouldAnimateEntrance =
      this.shouldAnimateTileEntrance &&
      this.shouldAnimateBoardEntrance(newGrid);

    this.grid = newGrid;
    if (onTileRotate) this.onTileRotate = onTileRotate;
    if (colors) {
      this.colors = {
        primary: this.parseColor(colors.primary),
        glow: this.parseColor(colors.glow),
        bg: this.parseColor(colors.background),
      };
    }
    this.tileType = tileType ?? this.tileType;
    if (typeof forceMobileViewport === "boolean") {
      this.forceMobileViewport = forceMobileViewport;
    }

    this.renderGrid(shouldAnimateEntrance);
    this.previousGridSnapshot = this.cloneGridSnapshot(newGrid);
  }

  private handleResize() {
    this.renderGrid();
  }

  private parseColor(colorStr: string): number {
    if (!colorStr) return 0xffffff;
    if (colorStr.startsWith("#")) {
      return Number.parseInt(colorStr.replace("#", "0x"));
    }
    if (colorStr.startsWith("rgba") || colorStr.startsWith("rgb")) {
      const match = colorStr.match(/[\d.]+/g);
      if (match && match.length >= 3) {
        const r = Number.parseInt(match[0]);
        const g = Number.parseInt(match[1]);
        const b = Number.parseInt(match[2]);
        return (r << 16) + (g << 8) + b;
      }
    }
    return 0xffffff;
  }

  private getRotationStepDelta(fromRotation: number, toRotation: number) {
    let delta = toRotation - fromRotation;
    while (delta > 2) delta -= 4;
    while (delta < -2) delta += 4;
    return delta;
  }

  private cloneGridSnapshot(sourceGrid: InfinityTileCell[][]) {
    return sourceGrid.map((row) => row.map((cell) => ({ ...cell })));
  }

  private shouldAnimateBoardEntrance(nextGrid: InfinityTileCell[][]): boolean {
    if (!this.previousGridSnapshot.length) return true;
    if (this.previousGridSnapshot.length !== nextGrid.length) return true;

    const previousCols = this.previousGridSnapshot[0]?.length ?? 0;
    const nextCols = nextGrid[0]?.length ?? 0;
    if (previousCols !== nextCols) return true;

    let changedCellCount = 0;
    for (let y = 0; y < nextGrid.length; y += 1) {
      for (let x = 0; x < nextGrid[y].length; x += 1) {
        const prevCell = this.previousGridSnapshot[y]?.[x];
        const nextCell = nextGrid[y][x];
        if (!prevCell || !nextCell) {
          changedCellCount += 1;
          continue;
        }
        if (
          prevCell.type !== nextCell.type ||
          prevCell.rotation !== nextCell.rotation
        ) {
          changedCellCount += 1;
        }
      }
    }
    // Match feat/infinity-pool behavior: avoid re-animating the whole grid for
    // single-tile edits (e.g. rotate in randomized editor).
    return changedCellCount > 1;
  }

  private setAllTilesInteractive(interactive: boolean) {
    this.tileSprites.flat().forEach((container) => {
      if (!container) return;
      if (interactive) container.setInteractive();
      else container.disableInteractive();
    });
  }

  private renderGrid(animateEntrance = false) {
    this.cameras.main.setBackgroundColor(0x000000);

    const rows = this.grid.length;
    const cols = this.grid[0]?.length ?? 0;

    const availableWidth = this.scale.width;
    const availableHeight = this.scale.height;

    const viewportScale = this.forceMobileViewport ? 0.9 : 0.96;
    const fit = Math.min(availableWidth, availableHeight) * viewportScale;
    const cellSize = cols > 0 ? fit / cols : fit;
    const tileSize = cellSize * 0.94;
    const hitAreaSize = cellSize * 0.92;

    const startX = availableWidth / 2 - (cols * cellSize) / 2 + cellSize / 2;
    const startY = availableHeight / 2 - (rows * cellSize) / 2 + cellSize / 2;

    this.grid.forEach((row, y) => {
      if (!this.tileSprites[y]) this.tileSprites[y] = [];
      row.forEach((cell, x) => {
        const targetAngle = cell.rotation * 90;
        const existing = this.tileSprites[y][x];

        if (!existing) {
          const graphics = this.add.graphics();
          this.drawTile(graphics, cell, tileSize);

          const container = this.add.container(
            Math.round(startX + x * cellSize),
            Math.round(startY + y * cellSize),
            [graphics],
          );

          container.setAngle(targetAngle);
          container.setData("logicalRotation", cell.rotation);

          const hitArea = new Phaser.Geom.Rectangle(
            -hitAreaSize / 2,
            -hitAreaSize / 2,
            hitAreaSize,
            hitAreaSize,
          );
          container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
          container.on("pointerdown", () => {
            if (this.isInputLocked) return;
            if (this.onTileRotate) this.onTileRotate(x, y);
          });
          container.on("pointerover", () => {
            if (this.isInputLocked) return;
            this.tweens.add({
              targets: container,
              scale: 1.05,
              duration: 200,
              ease: "Power2",
            });
          });
          container.on("pointerout", () => {
            if (this.isInputLocked) return;
            this.tweens.add({
              targets: container,
              scale: 1,
              duration: 200,
              ease: "Power2",
            });
          });

          this.tileSprites[y][x] = container;
          return;
        }

        existing.setPosition(
          Math.round(startX + x * cellSize),
          Math.round(startY + y * cellSize),
        );
        existing.setScale(1);

        const hitArea = existing.input?.hitArea;
        if (hitArea instanceof Phaser.Geom.Rectangle) {
          hitArea.setTo(
            -hitAreaSize / 2,
            -hitAreaSize / 2,
            hitAreaSize,
            hitAreaSize,
          );
        }

        const previousLogicalRotation = existing.getData("logicalRotation");
        const lastRotation =
          typeof previousLogicalRotation === "number"
            ? previousLogicalRotation
            : cell.rotation;
        const rotationStepDelta = this.getRotationStepDelta(
          lastRotation,
          cell.rotation,
        );

        if (rotationStepDelta !== 0) {
          this.tweens.killTweensOf(existing);
          this.tweens.add({
            targets: existing,
            angle: existing.angle + rotationStepDelta * 90,
            duration: 400,
            ease: "Back.easeOut",
            easeParams: [1.5],
          });
          existing.setData("logicalRotation", cell.rotation);
        } else if (existing.angle !== targetAngle) {
          existing.setAngle(targetAngle);
        }

        const graphics = existing.list[0] as Phaser.GameObjects.Graphics;
        graphics?.clear();
        if (graphics) this.drawTile(graphics, cell, tileSize);
      });
    });

    // Cleanup any extra rows/cols
    if (this.tileSprites.length > rows) {
      for (let y = rows; y < this.tileSprites.length; y++) {
        this.tileSprites[y].forEach((s) => s?.destroy());
      }
      this.tileSprites.splice(rows);
    }
    this.tileSprites.forEach((row, y) => {
      const target = this.grid[y]?.length ?? 0;
      if (row.length > target) {
        for (let x = target; x < row.length; x++) row[x]?.destroy();
        row.splice(target);
      }
    });

    if (!animateEntrance) {
      this.isInputLocked = false;
      this.setAllTilesInteractive(true);
      return;
    }

    this.isInputLocked = true;
    this.setAllTilesInteractive(false);
    this.tweens.killAll();

    const flatTiles = this.tileSprites.flat().filter(Boolean);
    flatTiles.forEach((tile, index) => {
      tile.setAlpha(0);
      tile.setScale(0.84);
      this.tweens.add({
        targets: tile,
        alpha: 1,
        scale: 1,
        duration: 260,
        delay: index * 45,
        ease: "Sine.easeOut",
      });
    });

    const totalDelay = Math.max(0, (flatTiles.length - 1) * 45 + 260);
    this.time.delayedCall(totalDelay + 20, () => {
      this.isInputLocked = false;
      this.setAllTilesInteractive(true);
    });
  }

  private drawTile(
    graphics: Phaser.GameObjects.Graphics,
    cell: InfinityTileCell,
    size: number,
  ) {
    if (this.tileType === INFINITY_TILE_RENDER_TYPE.OUTLINE) {
      this.drawOutlineTile(graphics, cell, size);
      return;
    }

    const center = 0;
    const strokeWidth = Math.max(5, size * 0.1);
    const color = this.colors.primary;
    const alpha = 0.98;
    const glowColor = this.colors.glow || this.colors.primary;

    for (let i = 1; i <= 2; i++) {
      const layerWidth = strokeWidth + i * 1.5;
      const layerAlpha = i === 1 ? 0.12 : 0.06;
      graphics.lineStyle(layerWidth, glowColor, layerAlpha);
      this.renderShape(graphics, cell.type, center, size);
    }

    graphics.lineStyle(strokeWidth, color, alpha);
    this.renderShape(graphics, cell.type, center, size);
  }

  private drawOutlineTile(
    graphics: Phaser.GameObjects.Graphics,
    cell: InfinityTileCell,
    size: number,
  ) {
    const center = 0;
    const color = this.colors.primary;
    const glowColor = this.colors.glow || this.colors.primary;
    const glowAlpha = 0.12;
    const outlineAlpha = 0.96;
    const lineWidth = Math.max(1.4, size * 0.026);
    const gapWidth = Math.max(2, size * 0.05);
    const combinedWidth = lineWidth * 2 + gapWidth;

    graphics.lineStyle(combinedWidth + 1.2, glowColor, glowAlpha);
    this.renderShape(graphics, cell.type, center, size, false);

    graphics.lineStyle(combinedWidth, color, outlineAlpha);
    this.renderShape(graphics, cell.type, center, size, false);

    graphics.lineStyle(gapWidth, this.colors.bg, 1);
    this.renderShape(graphics, cell.type, center, size, false);
  }

  private drawSegment(
    graphics: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) {
    graphics.lineBetween(x1, y1, x2, y2);
  }

  private drawArcSegment(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    anticlockwise: boolean,
  ) {
    graphics.beginPath();
    graphics.arc(cx, cy, radius, startAngle, endAngle, anticlockwise);
    graphics.strokePath();
  }

  private drawTerminalCap(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    strokeWidth: number,
    color: number,
    alpha: number,
  ) {
    graphics.fillStyle(color, alpha);
    graphics.fillCircle(x, y, strokeWidth / 2);
  }

  private renderShape(
    graphics: Phaser.GameObjects.Graphics,
    type: InfinityTileCell["type"],
    center: number,
    size: number,
    showEndpoints = true,
  ) {
    const halfSize = size / 2;
    const strokeWidth = Math.max(5, size * 0.1);
    const color = this.colors.primary;
    const alpha = 0.98;

    switch (type) {
      case "cap":
        this.drawSegment(
          graphics,
          center,
          center - halfSize * 0.2,
          center,
          -halfSize,
        );
        if (showEndpoints) {
          this.drawTerminalCap(
            graphics,
            center,
            center - halfSize * 0.2,
            strokeWidth,
            color,
            alpha,
          );
          this.drawTerminalCap(
            graphics,
            center,
            -halfSize,
            strokeWidth,
            color,
            alpha,
          );
        }
        break;
      case "straight":
        this.drawSegment(graphics, center, -halfSize, center, halfSize);
        if (showEndpoints) {
          this.drawTerminalCap(
            graphics,
            center,
            -halfSize,
            strokeWidth,
            color,
            alpha,
          );
          this.drawTerminalCap(
            graphics,
            center,
            halfSize,
            strokeWidth,
            color,
            alpha,
          );
        }
        break;
      case "elbow":
        this.drawArcSegment(
          graphics,
          halfSize,
          -halfSize,
          halfSize,
          Math.PI,
          Math.PI / 2,
          true,
        );
        if (showEndpoints) {
          this.drawTerminalCap(
            graphics,
            0,
            -halfSize,
            strokeWidth,
            color,
            alpha,
          );
          this.drawTerminalCap(
            graphics,
            halfSize,
            0,
            strokeWidth,
            color,
            alpha,
          );
        }
        break;
      case "tee":
        this.drawSegment(graphics, center, center, center, -halfSize);
        this.drawSegment(graphics, center, center, center, halfSize);
        this.drawSegment(graphics, center, center, halfSize, center);
        if (showEndpoints) {
          this.drawTerminalCap(
            graphics,
            center,
            -halfSize,
            strokeWidth,
            color,
            alpha,
          );
          this.drawTerminalCap(
            graphics,
            center,
            halfSize,
            strokeWidth,
            color,
            alpha,
          );
          this.drawTerminalCap(
            graphics,
            halfSize,
            center,
            strokeWidth,
            color,
            alpha,
          );
        }
        break;
      case "curved_v":
        this.drawArcSegment(
          graphics,
          halfSize,
          -halfSize,
          halfSize,
          Math.PI,
          Math.PI / 2,
          true,
        );
        if (showEndpoints) {
          this.drawTerminalCap(
            graphics,
            0,
            -halfSize,
            strokeWidth,
            color,
            alpha,
          );
        }
        this.drawArcSegment(
          graphics,
          halfSize,
          halfSize,
          halfSize,
          Math.PI,
          Math.PI * 1.5,
          false,
        );
        if (showEndpoints) {
          this.drawTerminalCap(
            graphics,
            0,
            halfSize,
            strokeWidth,
            color,
            alpha,
          );
          graphics.fillStyle(color, alpha);
          graphics.fillCircle(halfSize, center, strokeWidth / 2);
        }
        break;
      case "cross":
        this.drawSegment(graphics, center, center, center, -halfSize);
        this.drawSegment(graphics, center, center, center, halfSize);
        this.drawSegment(graphics, center, center, -halfSize, center);
        this.drawSegment(graphics, center, center, halfSize, center);
        if (showEndpoints) {
          this.drawTerminalCap(
            graphics,
            center,
            -halfSize,
            strokeWidth,
            color,
            alpha,
          );
          this.drawTerminalCap(
            graphics,
            center,
            halfSize,
            strokeWidth,
            color,
            alpha,
          );
          this.drawTerminalCap(
            graphics,
            -halfSize,
            center,
            strokeWidth,
            color,
            alpha,
          );
          this.drawTerminalCap(
            graphics,
            halfSize,
            center,
            strokeWidth,
            color,
            alpha,
          );
        }
        break;
      default:
        break;
    }
  }
}
