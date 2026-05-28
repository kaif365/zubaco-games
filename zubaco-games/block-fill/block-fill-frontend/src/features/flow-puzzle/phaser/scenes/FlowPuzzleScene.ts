import * as Phaser from 'phaser';
import { coordKey, findEndpointHit, isCellEnabled } from '@/features/flow-puzzle/engine/flowEngine';
import type {
  FlowBoardExternalState,
  FlowBoardSceneCallbacks,
} from '@/features/flow-puzzle/phaser/types';
import type { GridCoord } from '@/features/flow-puzzle/types';
import { getLevelCols, getLevelRows } from '@/features/flow-puzzle/utils/levelGrid';
import { BOARD_DESIGN_SYSTEM, scaleRgb } from '@/features/flow-puzzle/phaser/themeColor';

interface BoardMetrics {
  boardWidth: number;
  boardHeight: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
}

export class FlowPuzzleScene extends Phaser.Scene {
  private readonly callbacks: FlowBoardSceneCallbacks;

  private boardState: FlowBoardExternalState | null = null;

  private gridGraphics!: Phaser.GameObjects.Graphics;

  private pathGlowGraphics!: Phaser.GameObjects.Graphics;

  private pathCoreGraphics!: Phaser.GameObjects.Graphics;

  private overlayGraphics!: Phaser.GameObjects.Graphics;

  // nodeGraphics removed — replaced by hexNodeSprites

  private hexNodeSprites: Map<string, Phaser.GameObjects.Image> = new Map();

  private boardMetrics: BoardMetrics = {
    boardWidth: 0,
    boardHeight: 0,
    cellSize: 0,
    offsetX: 0,
    offsetY: 0,
  };

  private activePointerId: number | null = null;

  private lastCellKey: string | null = null;

  /** 0 = animation start, 1 = fully revealed. Starts at 1 so static redraws are unaffected before the first intro runs. */
  private introProgress = 1;

  private introTween: Phaser.Tweens.Tween | null = null;

  constructor(callbacks: FlowBoardSceneCallbacks) {
    super('flow-puzzle-scene');
    this.callbacks = callbacks;
  }

  create() {
    this.cameras.main.setRoundPixels(false);

    this.gridGraphics = this.add.graphics();
    this.pathGlowGraphics = this.add.graphics();
    this.pathCoreGraphics = this.add.graphics();
    // overlayGraphics added last so it renders on top of sprites
    this.overlayGraphics = this.add.graphics();

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this);
    this.input.on('pointercancel', this.handlePointerUp, this);

    if (this.boardState) {
      this.startIntroAnimation();
    }
  }

  setBoardState(state: FlowBoardExternalState) {
    const isNewLevel = !this.boardState || this.boardState.level.id !== state.level.id;

    if (isNewLevel && this.sys.isActive()) {  // ✅ guard: only clean up after scene is ready
    this.hexNodeSprites.forEach((sprite) => sprite.destroy());
    this.hexNodeSprites.clear();

    this.textures.getTextureKeys()
      .filter((k) => k.startsWith('hex_'))
      .forEach((k) => this.textures.remove(k));
  }

    this.boardState = state;

    if (this.gridGraphics) {
      if (isNewLevel) {
        this.startIntroAnimation();
      } else {
        this.redraw();
      }
    }
  }

  setBoardSize(width: number, height: number) {
    this.scale.resize(width, height);
    this.cameras.main.setSize(width, height);

    // cellSize changes on resize — textures must be regenerated
    this.hexNodeSprites.forEach((sprite) => sprite.destroy());
    this.hexNodeSprites.clear();
    this.textures.getTextureKeys()
      .filter((k) => k.startsWith('hex_'))
      .forEach((k) => this.textures.remove(k));

    if (this.gridGraphics) {
      this.redraw();
    }
  }

  shutdownScene() {
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerup', this.handlePointerUp, this);
    this.input.off('pointerupoutside', this.handlePointerUp, this);
    this.input.off('pointercancel', this.handlePointerUp, this);

    this.hexNodeSprites.forEach((sprite) => sprite.destroy());
    this.hexNodeSprites.clear();
  }

  /**
   * Runs the board intro animation, sweeping introProgress from 0 → 1 over 650 ms.
   * Stops any in-flight animation before starting a new one.
   */
  private startIntroAnimation() {
    if (this.introTween) {
      this.introTween.stop();
      this.introTween = null;
    }
    this.introProgress = 0;
    this.introTween = this.tweens.addCounter({
      from: 0,
      to: 100,
      duration: 650,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        const v = tween.getValue();
        this.introProgress = (v === null ? 0 : v) / 100;
        this.redraw();
      },
      onComplete: () => {
        this.introProgress = 1;
        this.introTween = null;
        this.redraw();
      },
    });
  }

  private redraw() {
    const state = this.boardState;
    if (!state) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    if (width <= 0 || height <= 0) {
      return;
    }

    this.boardMetrics = this.computeBoardMetrics(
      width,
      height,
      getLevelRows(state.level),
      getLevelCols(state.level),
    );

    this.gridGraphics.clear();
    this.pathGlowGraphics.clear();
    this.pathCoreGraphics.clear();
    this.overlayGraphics.clear();
    // Note: no nodeGraphics.clear() — sprites are persistent, updated in drawNodes()

    this.drawBoardBase();
    this.drawGridCells();
    this.drawPaths();
    this.drawNodes();
    this.drawOverlay();
  }

  private computeBoardMetrics(
    width: number,
    height: number,
    rows: number,
    cols: number,
  ): BoardMetrics {
    const availableWidth = Math.max(1, width);
    const availableHeight = Math.max(1, height);
    const cellSize = Math.floor(
      Math.min(availableWidth / cols, availableHeight / rows),
    );
    const boardWidth = cellSize * cols;
    const boardHeight = cellSize * rows;
    const offsetX = (width - boardWidth) / 2;
    const offsetY = (height - boardHeight) / 2;

    return { boardWidth, boardHeight, cellSize, offsetX, offsetY };
  }

  private drawBoardBase() {
    const state = this.boardState;
    if (!state) return;

    const { boardWidth, boardHeight, offsetX, offsetY } = this.boardMetrics;
    const baseAlpha = Math.min(1, this.introProgress * 3);

    // Fetch dynamic background color from CSS variable
    const eclipseVar = getComputedStyle(document.documentElement).getPropertyValue('--stage-eclipse').trim();
    let fillColor: number = BOARD_DESIGN_SYSTEM.baseFill;
    if (eclipseVar) {
      const parsed = Phaser.Display.Color.HexStringToColor(eclipseVar);
      fillColor = parsed.color;
    }

    this.gridGraphics.fillStyle(fillColor, 0.48 * baseAlpha);
    this.gridGraphics.fillRoundedRect(offsetX, offsetY, boardWidth, boardHeight, 9);
  }

  private drawGridCells() {
    const state = this.boardState;
    if (!state) {
      return;
    }

    const { level } = state;
    const { gridLine, cellEnabledFill, cellBlockedTint } = BOARD_DESIGN_SYSTEM;
    const rows = getLevelRows(level);
    const cols = getLevelCols(level);
    const { cellSize, offsetX, offsetY } = this.boardMetrics;
    // Cascade spans introProgress 0 → 0.75; each cell takes a 0.25 window to appear.
    const maxDiag = Math.max(1, rows + cols - 2);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const diagNorm = (row + col) / maxDiag;
        const raw = (this.introProgress - diagNorm * 0.65) / 0.25;
        const t = Math.max(0, Math.min(1, raw));
        // Smooth step: ease-in-out curve between 0 and 1.
        const cellAlpha = t * t * (3 - 2 * t);

        if (cellAlpha <= 0) continue;

        const x = offsetX + col * cellSize;
        const y = offsetY + row * cellSize;
        const enabled = isCellEnabled(level, { row, col });

        const padding = 2;
        const drawSize = cellSize - padding * 2;
        const drawX = x + padding;
        const drawY = y + padding;
        const radius = 9;

        const lineA = gridLine.alpha * cellAlpha;

        if (enabled) {
          this.gridGraphics.fillStyle(cellEnabledFill.color, cellEnabledFill.alpha * cellAlpha);
          this.gridGraphics.fillRoundedRect(drawX, drawY, drawSize, drawSize, radius);
        } else {
          this.gridGraphics.fillStyle(cellEnabledFill.color, 0.98 * cellAlpha);
          this.gridGraphics.fillRoundedRect(drawX, drawY, drawSize, drawSize, radius);
          this.gridGraphics.fillStyle(cellBlockedTint.color, cellBlockedTint.alpha * cellAlpha);
          this.gridGraphics.fillRoundedRect(drawX, drawY, drawSize, drawSize, radius);
        }
        this.gridGraphics.lineStyle(1, gridLine.color, lineA);
        this.gridGraphics.strokeRoundedRect(drawX, drawY, drawSize, drawSize, radius);
      }
    }
  }

  private drawPaths() {
    const state = this.boardState;
    if (!state) {
      return;
    }

    const { level, session } = state;
    const strokeWidth = Math.max(12, this.boardMetrics.cellSize * 0.42);
    const coreWidth = Math.max(4, strokeWidth * 0.38);

    level.nodes.forEach((node) => {
      const cells = session.paths[node.colorId] ?? [];
      if (cells.length === 0) {
        return;
      }

      const coreColor = Phaser.Display.Color.HexStringToColor(node.colorHex).color;
      const darkerColor = scaleRgb(coreColor, 0.65);

      this.pathCoreGraphics.lineStyle(coreWidth, darkerColor, 1.0);
      this.pathCoreGraphics.beginPath();
      cells.forEach((cell, index) => {
        const point = this.getCellCenter(cell);
        if (index === 0) {
          this.pathCoreGraphics.moveTo(point.x, point.y);
          return;
        }
        this.pathCoreGraphics.lineTo(point.x, point.y);
      });
      this.pathCoreGraphics.strokePath();

      // Draw solid circles at each point to create rounded joins and caps
      cells.forEach((cell) => {
        const point = this.getCellCenter(cell);
        this.pathCoreGraphics.fillStyle(darkerColor, 1.0);
        this.pathCoreGraphics.fillCircle(point.x, point.y, coreWidth / 2);
      });
    });
  }

  /**
   * Creates a hex node texture on an offscreen canvas and registers it with Phaser.
   * Skipped if the texture key already exists (same color + same radius).
   */
  private createHexTexture(
    key: string,
    radius: number,
    fillColor: number,
    darkerColor: number,
  ): void {
    if (this.textures.exists(key)) return;

    const size = Math.ceil(radius * 2 + 8); // +8 padding so edges aren't clipped
    const cx = size / 2;
    const cy = size / 2;

    const toCSS = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const drawHex = (r: number, color: string, alpha = 1) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 + 30) * (Math.PI / 180);
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Layer 1 — outer hex (full color)
    drawHex(radius, toCSS(fillColor));
    // Layer 2 — mid hex (darker ring)
    drawHex(radius * 0.8, toCSS(darkerColor));
    // Layer 3 — inner hex (full color core)
    drawHex(radius * 0.67, toCSS(fillColor));
    // Layer 4 — subtle white tint on core
    drawHex(radius * 0.67, 'white', 0.1);

    // Reset globalAlpha before handing canvas to Phaser
    ctx.globalAlpha = 1;

    this.textures.addCanvas(key, canvas);
  }

  private drawNodes() {
    const state = this.boardState;
    if (!state) return;

    // Nodes pop in after cells: introProgress 0.55 → 1.0 with smooth-step ease.
    const rawNode = (this.introProgress - 0.55) / 0.45;
    const nodeT = Math.max(0, Math.min(1, rawNode));
    const nodeEased = nodeT * nodeT * (3 - 2 * nodeT);

    const { level } = state;
    const fullRadius = this.boardMetrics.cellSize * 0.28;

    // Track which sprite keys are active this frame so stale ones can be cleaned up
    const activeKeys = new Set<string>();

    level.nodes.forEach((node) => {
      const fillColor = Phaser.Display.Color.HexStringToColor(node.colorHex).color;
      const darkerColor = scaleRgb(fillColor, 0.65);

      // Texture key encodes color + radius so a resize always regenerates correctly
      const textureKey = `hex_${node.colorHex}_${Math.round(fullRadius)}`;
      this.createHexTexture(textureKey, fullRadius, fillColor, darkerColor);

      node.endpoints.forEach((coord) => {
        const point = this.getCellCenter(coord);
        const spriteKey = `${node.colorHex}_${coord.row}_${coord.col}`;
        activeKeys.add(spriteKey);

        let sprite = this.hexNodeSprites.get(spriteKey);

        if (!sprite) {
          // Insert sprite after pathCoreGraphics but before overlayGraphics
          // by adding it to the scene — display list order matches creation order
          sprite = this.add.image(point.x, point.y, textureKey);
          this.hexNodeSprites.set(spriteKey, sprite);
        }

        sprite.setTexture(textureKey);
        sprite.setPosition(point.x, point.y);
        sprite.setAlpha(nodeEased);
        // Scale drives the pop-in; at nodeEased=0 the sprite is invisible + zero-size
        sprite.setScale(nodeEased);
        sprite.setVisible(nodeEased > 0);
      });
    });

    // Destroy sprites for nodes that are no longer part of the level
    this.hexNodeSprites.forEach((sprite, key) => {
      if (!activeKeys.has(key)) {
        sprite.destroy();
        this.hexNodeSprites.delete(key);
      }
    });
  }

  private drawOverlay() {
    const state = this.boardState;
    if (!state || !state.disabled) {
      return;
    }

    const { boardWidth, boardHeight, offsetX, offsetY } = this.boardMetrics;
    const o = BOARD_DESIGN_SYSTEM.overlayFill;
    this.overlayGraphics.fillStyle(o.color, o.alpha);
    this.overlayGraphics.fillRect(offsetX, offsetY, boardWidth, boardHeight);
  }

  private getCellCenter(coord: GridCoord) {
    const { cellSize, offsetX, offsetY } = this.boardMetrics;
    return {
      x: Math.round(offsetX + coord.col * cellSize + cellSize / 2),
      y: Math.round(offsetY + coord.row * cellSize + cellSize / 2),
    };
  }

  private pointerToCoord(pointer: Phaser.Input.Pointer): GridCoord | null {
    const state = this.boardState;
    if (!state) {
      return null;
    }

    const rows = getLevelRows(state.level);
    const cols = getLevelCols(state.level);
    const { boardWidth, boardHeight, cellSize, offsetX, offsetY } = this.boardMetrics;
    const x = pointer.worldX;
    const y = pointer.worldY;
    if (x < offsetX || y < offsetY || x > offsetX + boardWidth || y > offsetY + boardHeight) {
      return null;
    }

    const coord = {
      row: Math.max(0, Math.min(rows - 1, Math.floor((y - offsetY) / cellSize))),
      col: Math.max(0, Math.min(cols - 1, Math.floor((x - offsetX) / cellSize))),
    };

    return isCellEnabled(state.level, coord) ? coord : coord;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    const state = this.boardState;
    if (!state || state.disabled) {
      return;
    }

    const coord = this.pointerToCoord(pointer);
    if (!coord) {
      return;
    }

    const endpointHit = findEndpointHit(state.level, coord);
    const pathEntry = Object.entries(state.session.paths).find(([, cells]) =>
      cells.some((cell) => cell.row === coord.row && cell.col === coord.col),
    );

    if (!endpointHit && !pathEntry) {
      return;
    }

    this.activePointerId = pointer.id;
    this.lastCellKey = coordKey(coord);
    this.callbacks.onBeginPath(coord);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    const state = this.boardState;
    if (!state || state.disabled || this.activePointerId !== pointer.id) {
      return;
    }

    const coord = this.pointerToCoord(pointer);
    if (!coord) {
      return;
    }

    const nextKey = coordKey(coord);
    if (nextKey === this.lastCellKey) {
      return;
    }

    this.lastCellKey = nextKey;
    this.callbacks.onDragPath(coord);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (this.activePointerId !== null && this.activePointerId !== pointer.id) {
      return;
    }

    this.activePointerId = null;
    this.lastCellKey = null;
    this.callbacks.onEndPath();
  }
}