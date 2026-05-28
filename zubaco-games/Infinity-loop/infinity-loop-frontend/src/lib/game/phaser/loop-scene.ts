import {
  DYNAMIC_ROUND_INSET_SCALE,
  TILE_ROTATION_TWEEN_MS,
} from "@/constants/loop-scene";
import { logger } from "@/lib/default-logger";
import { GridCell, TileType } from "@/types/tile";
import { TILE_RENDER_TYPE, TileRenderType } from "@/types/tile-render";
import * as Phaser from "phaser";

export class LoopScene extends Phaser.Scene {
  private grid: GridCell[][] = [];
  private previousGridSnapshot: GridCell[][] = [];
  private shouldAnimateTileEntrance = true;
  private mobileInsetScaleOverride: number | null = null;
  private onTileRotate?: (x: number, y: number) => void;
  private tileSprites: Phaser.GameObjects.Container[][] = [];
  private isInputLocked = false;
  private colors = {
    primary: 0x38bdf8,
    glow: 0x0ea5e9,
    bg: 0x07090d,
  };
  private tileType: TileRenderType = TILE_RENDER_TYPE.FILLED;

  constructor() {
    super("LoopScene");
  }

  init(data: {
    grid: GridCell[][];
    onTileRotate: (x: number, y: number) => void;
    colors: { primary: string; glow: string; background: string };
    animateTileEntrance?: boolean;
    mobileInsetScaleOverride?: number | null;
    tileType?: TileRenderType;
  }) {
    this.grid = data.grid || [];
    this.onTileRotate = data.onTileRotate;
    this.shouldAnimateTileEntrance = data.animateTileEntrance ?? true;
    this.mobileInsetScaleOverride = data.mobileInsetScaleOverride ?? null;
    if (data.colors) {
      this.colors = {
        primary: this.parseColor(data.colors.primary),
        glow: this.parseColor(data.colors.glow),
        bg: this.parseColor(data.colors.background),
      };
    }
    this.tileType = data.tileType ?? TILE_RENDER_TYPE.FILLED;
  }

  create() {
    logger.info("Phaser Scene: create called");
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
    this.scale.on("resize", this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize, this);
    });
    this.renderGrid(this.shouldAnimateTileEntrance);
    this.previousGridSnapshot = this.cloneGridSnapshot(this.grid);
  }

  private handleResize() {
    this.renderGrid();
  }

  private parseColor(colorStr: string): number {
    if (!colorStr) return 0xffffff;
    if (colorStr.startsWith("#")) {
      return parseInt(colorStr.replace("#", "0x"));
    }
    if (colorStr.startsWith("rgba") || colorStr.startsWith("rgb")) {
      const match = colorStr.match(/[\d.]+/g);
      if (match && match.length >= 3) {
        const r = parseInt(match[0]);
        const g = parseInt(match[1]);
        const b = parseInt(match[2]);
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

  private resolveDynamicRoundInsetScale(longestSide: number) {
    if (longestSide <= 3) {
      return DYNAMIC_ROUND_INSET_SCALE.MOBILE_3;
    }
    if (longestSide <= 4) {
      return DYNAMIC_ROUND_INSET_SCALE.MOBILE_4;
    }
    if (longestSide <= 5) {
      return DYNAMIC_ROUND_INSET_SCALE.MOBILE_5;
    }
    return DYNAMIC_ROUND_INSET_SCALE.MOBILE_6_PLUS;
  }

  updateGrid(
    newGrid: GridCell[][],
    colors?: { primary: string; glow: string; background: string },
    onTileRotate?: (x: number, y: number) => void,
    animateTileEntrance?: boolean,
    mobileInsetScaleOverride?: number | null,
    tileType?: TileRenderType,
  ) {
    if (typeof animateTileEntrance === "boolean") {
      this.shouldAnimateTileEntrance = animateTileEntrance;
    }
    if (
      typeof mobileInsetScaleOverride === "number" ||
      mobileInsetScaleOverride === null
    ) {
      this.mobileInsetScaleOverride = mobileInsetScaleOverride;
    }
    const shouldAnimateEntrance =
      this.shouldAnimateTileEntrance &&
      this.shouldAnimateBoardEntrance(newGrid);
    this.grid = newGrid;
    if (onTileRotate) {
      this.onTileRotate = onTileRotate;
    }
    if (colors) {
      this.colors = {
        primary: this.parseColor(colors.primary),
        glow: this.parseColor(colors.glow),
        bg: this.parseColor(colors.background),
      };
    }
    this.tileType = tileType ?? this.tileType;
    this.renderGrid(shouldAnimateEntrance);
    this.previousGridSnapshot = this.cloneGridSnapshot(newGrid);
  }

  private cloneGridSnapshot(sourceGrid: GridCell[][]) {
    return sourceGrid.map((row) => row.map((cell) => ({ ...cell })));
  }

  private shouldAnimateBoardEntrance(nextGrid: GridCell[][]): boolean {
    if (!this.previousGridSnapshot.length) {
      return true;
    }

    if (this.previousGridSnapshot.length !== nextGrid.length) {
      return true;
    }

    const previousCols = this.previousGridSnapshot[0]?.length ?? 0;
    const nextCols = nextGrid[0]?.length ?? 0;
    if (previousCols !== nextCols) {
      return true;
    }

    let changedCellCount = 0;
    for (let y = 0; y < nextGrid.length; y += 1) {
      for (let x = 0; x < nextGrid[y].length; x += 1) {
        const previousCell = this.previousGridSnapshot[y]?.[x];
        const nextCell = nextGrid[y][x];
        if (!previousCell || !nextCell) {
          changedCellCount += 1;
          continue;
        }
        if (
          previousCell.type !== nextCell.type ||
          previousCell.rotation !== nextCell.rotation
        ) {
          changedCellCount += 1;
        }
      }
    }

    // A single changed cell is usually a user rotation; board loads change many.
    return changedCellCount > 1;
  }

  private setAllTilesInteractive(enabled: boolean) {
    this.tileSprites.forEach((row) => {
      row.forEach((tile) => {
        if (!tile?.input) {
          return;
        }
        if (enabled) {
          tile.setInteractive();
          return;
        }
        tile.disableInteractive();
      });
    });
  }

  private renderGrid(animateEntrance = false) {
    logger.info("Phaser Scene: rendering grid, cells:", this.grid?.length);

    if (!this.grid || this.grid.length === 0 || !this.grid[0]) {
      this.children.removeAll(true);
      this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
      return;
    }

    const camera = this.cameras?.main;
    const viewportWidth = camera?.width ?? this.scale?.width ?? 0;
    const viewportHeight = camera?.height ?? this.scale?.height ?? 0;
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    const cols = this.grid[0].length;
    const rows = this.grid.length;
    const cameraWidth = viewportWidth;
    const cameraHeight = viewportHeight;
    const longestSide = Math.max(cols, rows);
    const isMobilePortraitViewport =
      viewportWidth < 768 && viewportHeight > viewportWidth;
    let insetRatio: number;
    if (isMobilePortraitViewport) {
      if (longestSide <= 4) {
        insetRatio = 0.03;
      } else if (longestSide <= 6) {
        insetRatio = 0.04;
      } else {
        insetRatio = 0.06;
      }
    } else if (longestSide <= 4) {
      insetRatio = 0.34;
    } else if (longestSide <= 6) {
      insetRatio = 0.3;
    } else {
      insetRatio = 0.26;
    }
    const isDynamicRound = !this.shouldAnimateTileEntrance;
    const shouldUseMobileInsetScaleOverride =
      typeof this.mobileInsetScaleOverride === "number" &&
      Number.isFinite(this.mobileInsetScaleOverride) &&
      this.mobileInsetScaleOverride > 0;
    if (isDynamicRound || shouldUseMobileInsetScaleOverride) {
      const dynamicRoundInsetScale =
        this.mobileInsetScaleOverride ??
        this.resolveDynamicRoundInsetScale(longestSide);
      insetRatio = Math.max(0.02, insetRatio * dynamicRoundInsetScale);
    }
    const inset = Math.min(cameraWidth, cameraHeight) * insetRatio;
    const availableWidth = Math.max(cameraWidth - inset * 2, 1);
    const availableHeight = Math.max(cameraHeight - inset * 2, 1);
    const cellSize = Math.min(availableWidth / cols, availableHeight / rows);
    const minTileSize = isMobilePortraitViewport ? 38 : 30;
    const tileSize = Math.max(minTileSize, cellSize);
    const hitAreaSize = cellSize * 0.82;
    const gridWidth = cols * cellSize;
    const gridHeight = rows * cellSize;

    const startX = (cameraWidth - gridWidth) / 2 + cellSize / 2;
    const startY = (cameraHeight - gridHeight) / 2 + cellSize / 2;

    this.grid.forEach((row, y) => {
      if (!this.tileSprites[y]) this.tileSprites[y] = [];
      if (!row) return;

      row.forEach((cell, x) => {
        if (!cell) return;

        let container = this.tileSprites[y][x];
        const targetAngle = cell.rotation * 90;

        if (!container) {
          container = this.add.container(
            Math.round(startX + x * cellSize),
            Math.round(startY + y * cellSize),
          );
          container.setScale(1);
          container.setAngle(targetAngle);
          container.setData("logicalRotation", cell.rotation);

          const graphics = this.add.graphics();
          this.drawTile(graphics, cell, tileSize);
          container.add(graphics);

          // Interaction
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

          // Hover effect
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
        } else {
          // Update existing container
          container.setPosition(
            Math.round(startX + x * cellSize),
            Math.round(startY + y * cellSize),
          );
          container.setScale(1);
          const hitArea = container.input?.hitArea;
          if (hitArea instanceof Phaser.Geom.Rectangle) {
            hitArea.setTo(
              -hitAreaSize / 2,
              -hitAreaSize / 2,
              hitAreaSize,
              hitAreaSize,
            );
          }

          // Keep wraparound rotations visually consistent with the logical
          // quarter-turn change: 3 -> 0 should animate as +90, and 0 -> 3
          // rollback should animate as -90.
          const previousLogicalRotation = container.getData("logicalRotation");
          const lastRotation =
            typeof previousLogicalRotation === "number"
              ? previousLogicalRotation
              : cell.rotation;
          const rotationStepDelta = this.getRotationStepDelta(
            lastRotation,
            cell.rotation,
          );

          if (rotationStepDelta !== 0) {
            this.tweens.killTweensOf(container);
            this.tweens.add({
              targets: container,
              angle: container.angle + rotationStepDelta * 90,
              duration: TILE_ROTATION_TWEEN_MS,
              ease: "Back.easeOut",
              easeParams: [1.5],
            });
            container.setData("logicalRotation", cell.rotation);
          } else if (container.angle !== targetAngle) {
            container.setAngle(targetAngle);
          }

          // Redraw graphics (to sync colors/glow)
          const graphics = container.list[0] as Phaser.GameObjects.Graphics;
          if (graphics) {
            graphics.clear();
            this.drawTile(graphics, cell, tileSize);
          }
        }
      });
    });

    // Cleanup extra sprites if grid shrank
    if (this.tileSprites.length > this.grid.length) {
      for (let y = this.grid.length; y < this.tileSprites.length; y++) {
        this.tileSprites[y].forEach((s) => s?.destroy());
      }
      this.tileSprites.splice(this.grid.length);
    }
    this.tileSprites.forEach((row, y) => {
      if (y < this.grid.length && row.length > this.grid[y].length) {
        for (let x = this.grid[y].length; x < row.length; x++) {
          row[x]?.destroy();
        }
        row.splice(this.grid[y].length);
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

    const flatTiles = this.tileSprites.flat();
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
    cell: GridCell,
    size: number,
  ) {
    if (this.tileType === TILE_RENDER_TYPE.OUTLINE) {
      this.drawOutlineTile(graphics, cell, size);
      return;
    }

    this.drawFilledTile(graphics, cell, size);
  }

  private drawFilledTile(
    graphics: Phaser.GameObjects.Graphics,
    cell: GridCell,
    size: number,
  ) {
    const center = 0;
    const shapeSize = size;
    const strokeWidth = Math.max(5, shapeSize * 0.1);
    const color = this.colors.primary;
    const alpha = 0.98;
    const glowColor = this.colors.glow || this.colors.primary;

    for (let i = 1; i <= 2; i++) {
      const layerWidth = strokeWidth + i * 1.5;
      const layerAlpha = i === 1 ? 0.12 : 0.06;
      graphics.lineStyle(layerWidth, glowColor, layerAlpha);
      this.renderShape(graphics, cell.type, center, shapeSize);
    }

    graphics.lineStyle(strokeWidth, color, alpha);
    this.renderShape(graphics, cell.type, center, shapeSize);
  }

  private drawOutlineTile(
    graphics: Phaser.GameObjects.Graphics,
    cell: GridCell,
    size: number,
  ) {
    const center = 0;
    const shapeSize = size;
    const color = this.colors.primary;
    const glowColor = this.colors.glow || this.colors.primary;
    const backgroundColor = this.colors.bg;
    const glowAlpha = 0.12;
    const outlineAlpha = 0.96;
    const lineWidth = Math.max(1.4, shapeSize * 0.026);
    const gapWidth = Math.max(2, shapeSize * 0.05);
    const combinedWidth = lineWidth * 2 + gapWidth;

    graphics.lineStyle(combinedWidth + 1.2, glowColor, glowAlpha);
    this.renderShape(graphics, cell.type, center, shapeSize, false);

    graphics.lineStyle(combinedWidth, color, outlineAlpha);
    this.renderShape(graphics, cell.type, center, shapeSize, false);

    // Keep the center hollow by painting the gap with board background.
    graphics.lineStyle(gapWidth, backgroundColor, 1);
    this.renderShape(graphics, cell.type, center, shapeSize, false);
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
    type: TileType,
    center: number,
    size: number,
    showEndpoints = true,
  ) {
    const halfSize = size / 2;
    const strokeWidth = Math.max(5, size * 0.1);
    const color = this.colors.glow || this.colors.primary;
    const alpha = 0.9;

    // Joint logic removed for uniform look

    switch (type) {
      case TileType.CAP:
        // Short endpoint stub (rotation handles N/E/S/W variants).
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
      case TileType.STRAIGHT:
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
      case TileType.ELBOW:
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
      case TileType.TEE:
        // T_NES base orientation (missing left branch).
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
      case TileType.CURVED_V: {
        // Base orientation must match logical bitmask rotation=0 (N,E,S), i.e. missing W.
        // Draw two quarter arcs that meet at the right midpoint:
        // top -> right and bottom -> right.

        // Arc 1: top to right (centered at top-right corner).
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

        // Arc 2: bottom to right (centered at bottom-right corner).
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
        }

        // Smooth the shared right-mid junction between the two arcs.
        if (showEndpoints) {
          graphics.fillStyle(color, alpha);
          graphics.fillCircle(halfSize, center, strokeWidth / 2);
        }

        break;
      }
      case TileType.CROSS:
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
    }
  }
}
