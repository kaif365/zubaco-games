import * as Phaser from "phaser";
import { LEVELS } from "./gameLevels";
import {
  ArrowPathData,
  GameDirection,
  GridPos,
  LevelData,
  ServerRoundStartData,
  ServerClickAck,
  GAME_EVENTS,
} from "./gameTypes";
import { serverRoundBridge } from "./serverRoundBridge";
import {
  MAX_HINTS,
  MOVE_CELLS_PER_SEC,
  INTRO_CELLS_PER_SEC,
  INTRO_HEAD_POP_MS,
  FLASH_MS,
  NORMAL_REVERSE_MULTIPLIER,
  FAST_REVERSE_MULTIPLIER,
  SERVER_FORWARD_SPEED_MULTIPLIER,
  AUTOPLAY_FORWARD_SPEED_MULTIPLIER,
  DEMO_FORWARD_SPEED_MULTIPLIER,
  SERVER_BLOCKED_VISUAL_EXTRA_CELLS,
  SERVER_BLOCKED_VISUAL_MAX_MS,
  BASE_GRID_SIZE,
  BASE_GRID_RENDER_SCALE,
  DEFAULT_BOARD_VIEW_ZOOM,
  SNAKE_MOTION,
  THEME,
} from "@/constants/game";

const BODY_SEGMENT_TEXTURE_KEY = "snake-body-segment";
const BODY_SEGMENT_TEXTURE_PATH = "/assets/snake-segment.svg";
const BODY_SEGMENT_TEXTURE_SIZE = 25;
const SNAKE_HEAD_TEXTURE_KEY = "snake-head";
const SNAKE_HEAD_TEXTURE_PATH = "/assets/snake-head.svg";
const SNAKE_HEAD_TEXTURE_WIDTH = 146;
const SNAKE_HEAD_TEXTURE_HEIGHT = 220;
const SNAKE_HEAD_ASPECT = 73 / 110;
const SNAKE_HEAD_COLORED_TEXTURE_PREFIX = "snake-head-color-";
const SNAKE_HEAD_WHITE_CHANNEL_MIN = 245;
const SNAKE_TAIL_TEXTURE_KEY = "snake-tail";
const SNAKE_TAIL_TEXTURE_PATH = "/assets/snake-tail.svg";
const SNAKE_TAIL_TEXTURE_WIDTH = 102;
const SNAKE_TAIL_TEXTURE_HEIGHT = 76;
const SNAKE_TAIL_ASPECT = 51 / 38;
const DEBUG_MODE_ENABLED = import.meta.env.VITE_DEBUG_MODE === "true";

// ─── helpers ──────────────────────────────────────────────────────────────────
function cellKey(x: number, y: number) {
  return `${x},${y}`;
}

function screenDir(d: GameDirection): { sx: number; sy: number } {
  switch (d) {
    case "up":
      return { sx: 0, sy: -1 };
    case "down":
      return { sx: 0, sy: 1 };
    case "left":
      return { sx: -1, sy: 0 };
    case "right":
      return { sx: 1, sy: 0 };
  }
}
function gridDirDelta(d: GameDirection): { dx: number; dy: number } {
  // Unity grid: y+ = up → in grid space "up" means +1 y
  switch (d) {
    case "up":
      return { dx: 0, dy: 1 };
    case "down":
      return { dx: 0, dy: -1 };
    case "left":
      return { dx: -1, dy: 0 };
    case "right":
      return { dx: 1, dy: 0 };
  }
}

function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const clampedT = Phaser.Math.Clamp(t, 0, 1);

  const r = Math.round(ar + (br - ar) * clampedT);
  const g = Math.round(ag + (bg - ag) * clampedT);
  const bl = Math.round(ab + (bb - ab) * clampedT);
  return (r << 16) | (g << 8) | bl;
}

function colorTextureSuffix(color: number): string {
  return (color & 0xffffff).toString(16).padStart(6, "0");
}

// ─── Arrow entity ─────────────────────────────────────────────────────────────
class Arrow {
  readonly gfx: Phaser.GameObjects.Graphics;
  readonly guideGfx: Phaser.GameObjects.Graphics;

  isMoving = false;
  isCleared = false;

  private isReversing = false;
  private hasHitBlocker = false;
  private flashTimer = 0;
  private hintTimer = 0;
  private moveTime = 0;
  private reverseSpeedMultiplier = NORMAL_REVERSE_MULTIPLIER;
  private awaitingServerAck = false;
  private serverBlockedVisualOnly = false;
  private serverBlockedReverseAtDist: number | null = null;
  private serverBlockedMaxForwardMs = 0;
  private introProgress = 1;
  private introDelay = 0;
  private introActive = false;
  private introPopTimer = 0;
  private slitherTime = 0;
  private anticipationTimer = 0;
  private clearBurstTimer = 0;
  private readonly bodySprites: Phaser.GameObjects.Image[] = [];
  private readonly headSprite: Phaser.GameObjects.Image;
  private readonly tailSprite: Phaser.GameObjects.Image;
  private tailSpriteWidth = 0;
  private activeBodySpriteCount = 0;

  private worldPts: { x: number; y: number }[] = [];
  private wpDists: number[] = []; // cumulative
  private totalLen = 0;

  private headDist = 0;
  private tailDist = 0;

  private lw = 5; // line width px
  private ahs = 12; // arrowhead size px
  private vc = 0; // visual cell = cell * snakeScale (draw-side sizing only)
  private exitDist = 0; // px tail must travel past path end to clear
  private pathTurnDamping = 1;

  constructor(
    private readonly scene: GameScene,
    private readonly data: ArrowPathData,
    private readonly gridH: number,
    private gridW: number,
    private cell: number,
    private ox: number,
    private oy: number,
    snakeScale = 1,
  ) {
    this.gfx = scene.add.graphics();
    this.guideGfx = scene.add.graphics();
    this.headSprite = scene.add.image(0, 0, SNAKE_HEAD_TEXTURE_KEY);
    this.tailSprite = scene.add.image(0, 0, SNAKE_TAIL_TEXTURE_KEY);
    this.gfx.setDepth(2);
    this.guideGfx.setDepth(4);
    this.headSprite.setOrigin(0.5);
    this.headSprite.setDepth(12);
    this.headSprite.setVisible(false);
    this.tailSprite.setOrigin(1, 0.5);
    this.tailSprite.setDepth(7);
    this.tailSprite.setVisible(false);
    this.updateGeometry(gridW, cell, ox, oy, false, snakeScale);
    this.draw();
  }

  relayout(
    gridW: number,
    cell: number,
    ox: number,
    oy: number,
    guidesOn: boolean,
    snakeScale = 1,
  ) {
    this.updateGeometry(gridW, cell, ox, oy, true, snakeScale);
    this.draw();
    this.guideGfx.clear();
    if (guidesOn) this.showGuide();
  }

  private updateGeometry(
    gridW: number,
    cell: number,
    ox: number,
    oy: number,
    preserveDistances: boolean,
    snakeScale = 1,
  ) {
    const distanceScale = this.cell > 0 ? cell / this.cell : 1;

    this.gridW = gridW;
    this.cell = cell;
    this.ox = ox;
    this.oy = oy;
    this.vc = cell * snakeScale;
    this.lw = Math.max(3, Math.min(16, this.vc * 0.2));
    this.ahs = Math.max(7, Math.min(28, this.vc * 0.36));

    // Convert grid → screen (flip y: Unity y=0 is bottom, canvas y=0 is top)
    this.worldPts = this.data.waypoints.map((wp) => this.g2s(wp));

    // Cumulative distances along the path
    this.wpDists = [0];
    for (let i = 1; i < this.worldPts.length; i++) {
      const dx = this.worldPts[i].x - this.worldPts[i - 1].x;
      const dy = this.worldPts[i].y - this.worldPts[i - 1].y;
      this.wpDists.push(this.wpDists[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    this.totalLen = this.wpDists[this.wpDists.length - 1];
    this.pathTurnDamping = this.computePathTurnDamping();
    if (preserveDistances) {
      this.headDist *= distanceScale;
      this.tailDist *= distanceScale;
      if (this.serverBlockedReverseAtDist !== null) {
        this.serverBlockedReverseAtDist *= distanceScale;
      }
    } else {
      this.headDist = this.totalLen;
      this.tailDist = 0;
    }

    // ── Compute exit distance: how far the tail must travel (beyond totalLen)
    //    before the whole arrow has physically left the grid.
    //    We measure from the head’s last waypoint to the grid edge in headDirection,
    //    then add half a cell so it fully clears before being marked as done.
    {
      const last = this.worldPts[this.worldPts.length - 1];
      const { sx, sy } = screenDir(this.data.headDirection);
      let distToEdge: number;
      if (sx > 0) distToEdge = ox + this.gridW * cell - last.x;
      else if (sx < 0) distToEdge = last.x - ox;
      else if (sy > 0) distToEdge = oy + this.gridH * cell - last.y;
      else distToEdge = last.y - oy;
      // clamp to at least one cell so pathological layouts still clear
      this.exitDist = Math.max(distToEdge, cell) + cell * 0.5;
    }
  }

  // ── coord helpers ────────────────────────────────────────────────────────
  private g2s(wp: GridPos) {
    return {
      x: this.ox + wp.x * this.cell + this.cell / 2,
      y: this.oy + (this.gridH - 1 - wp.y) * this.cell + this.cell / 2,
    };
  }

  private computePathTurnDamping(): number {
    if (this.worldPts.length < 3 || this.cell <= 0) return 1;

    let turns = 0;
    for (let i = 1; i < this.worldPts.length - 1; i++) {
      const prev = this.worldPts[i - 1];
      const curr = this.worldPts[i];
      const next = this.worldPts[i + 1];
      const ax = Math.sign(curr.x - prev.x);
      const ay = Math.sign(curr.y - prev.y);
      const bx = Math.sign(next.x - curr.x);
      const by = Math.sign(next.y - curr.y);
      if (ax !== bx || ay !== by) turns++;
    }

    const lengthCells = Math.max(this.totalLen / this.cell, 1);
    const turnDensity = Phaser.Math.Clamp(
      (turns / lengthCells) * SNAKE_MOTION.turnDensityScale,
      0,
      1,
    );
    return Phaser.Math.Linear(1, SNAKE_MOTION.turnDampingMin, turnDensity);
  }

  private posAt(dist: number): { x: number; y: number } {
    if (dist <= 0) return { ...this.worldPts[0] };

    if (dist >= this.totalLen) {
      const extra = dist - this.totalLen;
      const { sx, sy } = screenDir(this.data.headDirection);
      const last = this.worldPts[this.worldPts.length - 1];
      return { x: last.x + sx * extra, y: last.y + sy * extra };
    }

    for (let i = 1; i < this.wpDists.length; i++) {
      if (dist <= this.wpDists[i] + 0.001) {
        const seg = this.wpDists[i] - this.wpDists[i - 1];
        const t = seg > 0 ? (dist - this.wpDists[i - 1]) / seg : 0;
        const a = this.worldPts[i - 1],
          b = this.worldPts[i];
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
    }
    return { ...this.worldPts[this.worldPts.length - 1] };
  }

  private turnInfluenceAt(dist: number): number {
    if (this.wpDists.length < 3 || this.cell <= 0) return 0;

    let influence = 0;
    const range = this.cell * SNAKE_MOTION.cornerInfluenceCells;
    for (let i = 1; i < this.wpDists.length - 1; i++) {
      const proximity =
        1 - Phaser.Math.Clamp(Math.abs(dist - this.wpDists[i]) / range, 0, 1);
      influence = Math.max(influence, proximity);
    }

    return influence;
  }

  /** Returns the grid cell n steps ahead of the last waypoint in headDirection. */
  private gridCellAtStep(n: number): GridPos {
    const head = this.data.waypoints[this.data.waypoints.length - 1];
    const { dx, dy } = gridDirDelta(this.data.headDirection);
    return { x: head.x + dx * n, y: head.y + dy * n };
  }

  // ── occupancy ────────────────────────────────────────────────────────────
  populateOccupancy(occ: Map<string, Arrow>) {
    if (this.isCleared) return;

    if (
      this.isReversing ||
      this.hasHitBlocker ||
      this.serverBlockedVisualOnly
    ) {
      for (const wp of this.data.waypoints) {
        occ.set(cellKey(wp.x, wp.y), this);
      }
      return;
    }

    const minD = this.tailDist;
    const maxD = this.headDist;

    const min_i = Math.ceil(minD / this.cell - 0.45);
    const max_i = Math.floor(maxD / this.cell + 0.45);

    const maxWaypoints = this.data.waypoints.length;

    for (let i = min_i; i <= max_i; i++) {
      if (i < 0) continue;

      let pos: GridPos;
      if (i < maxWaypoints) {
        pos = this.data.waypoints[i];
      } else {
        const step = i - maxWaypoints + 1;
        pos = this.gridCellAtStep(step);
      }

      occ.set(cellKey(pos.x, pos.y), this);
    }
  }

  isSafeToClear(
    occ: Map<string, Arrow>,
    gridW: number,
    gridH: number,
  ): boolean {
    let s = 1;
    while (true) {
      const gCell = this.gridCellAtStep(s);
      if (gCell.x < 0 || gCell.x >= gridW || gCell.y < 0 || gCell.y >= gridH)
        break;
      const blockingArrow = occ.get(cellKey(gCell.x, gCell.y));
      if (blockingArrow && blockingArrow !== this) return false;
      s++;
    }
    return true;
  }

  willClear(occ: Map<string, Arrow>, gridW: number, gridH: number): boolean {
    if (this.isCleared) return true;
    if (
      !this.isMoving ||
      this.isReversing ||
      this.hasHitBlocker ||
      this.serverBlockedVisualOnly
    ) {
      return false;
    }

    let s = 1;
    while (true) {
      const gCell = this.gridCellAtStep(s);
      if (gCell.x < 0 || gCell.x >= gridW || gCell.y < 0 || gCell.y >= gridH) {
        break;
      }

      const blocker = occ.get(cellKey(gCell.x, gCell.y));
      if (blocker && blocker !== this) {
        if (blocker.isCleared) {
          s++;
          continue;
        }

        if (blocker.isMoving && !blocker.isReturningToPath()) {
          s++;
          continue;
        }

        return false;
      }

      s++;
    }

    return true;
  }

  isReturningToPath(): boolean {
    return (
      this.isReversing || this.hasHitBlocker || this.serverBlockedVisualOnly
    );
  }

  /**
   * Returns the current head world position.
   * Used by other arrows for world-space collision validation.
   */
  getHeadWorldPos(): { x: number; y: number } {
    return this.posAt(this.headDist);
  }

  /**
   * Returns true if the given world-space point overlaps this arrow's
   * current rendered body (between tailDist and headDist), within tolerance.
   * Used to confirm a grid-cell collision is a true physical collision.
   */
  bodyContainsWorldPoint(wx: number, wy: number): boolean {
    if (this.isCleared) return false;
    // Tolerance: half a cell. Generous enough for diagonal approaches but
    // won't trigger across an empty cell.
    const tol = this.cell * 0.5;

    // Walk the rendered body in small steps and see if any sample point
    // is within tolerance of (wx, wy).
    const steps =
      Math.ceil((this.headDist - this.tailDist) / (this.cell * 0.25)) + 2;
    for (let i = 0; i <= steps; i++) {
      const d = this.tailDist + (this.headDist - this.tailDist) * (i / steps);
      const p = this.posAt(d);
      if (Math.abs(p.x - wx) < tol && Math.abs(p.y - wy) < tol) return true;
    }
    return false;
  }

  showHint() {
    this.hintTimer = 1500;
    this.draw();
  }

  triggerFlash(durationMs: number = FLASH_MS) {
    this.flashTimer = durationMs;
    this.draw();
  }

  clearHint() {
    if (this.hintTimer > 0) {
      this.hintTimer = 0;
      this.draw();
    }
  }

  startIntro(delayMs: number) {
    this.introDelay = delayMs;
    this.introProgress = 0;
    this.introActive = true;
    this.introPopTimer = 0;
    this.draw();
  }

  isIntroRunning(): boolean {
    return this.introActive || this.introPopTimer > 0;
  }

  restoreCleared() {
    this.isCleared = true;
    this.isMoving = false;
    this.isReversing = false;
    this.hasHitBlocker = false;
    this.awaitingServerAck = false;
    this.serverBlockedVisualOnly = false;
    this.serverBlockedReverseAtDist = null;
    this.serverBlockedMaxForwardMs = 0;
    this.introDelay = 0;
    this.introProgress = 1;
    this.introActive = false;
    this.introPopTimer = 0;
    this.slitherTime = 0;
    this.anticipationTimer = 0;
    this.clearBurstTimer = 0;
    this.guideGfx.clear();
    this.draw();
  }

  // ── hit testing ──────────────────────────────────────────────────────────
  containsPoint(px: number, py: number): boolean {
    const threshold = this.cell * 0.55;
    // Check against each waypoint circle
    for (const wp of this.worldPts) {
      if (Math.abs(px - wp.x) < threshold && Math.abs(py - wp.y) < threshold)
        return true;
    }
    // Also check segment midpoints for long straight runs
    for (let i = 0; i < this.worldPts.length - 1; i++) {
      const mx = (this.worldPts[i].x + this.worldPts[i + 1].x) / 2;
      const my = (this.worldPts[i].y + this.worldPts[i + 1].y) / 2;
      if (Math.abs(px - mx) < threshold && Math.abs(py - my) < threshold)
        return true;
    }
    return false;
  }

  /** Returns the last waypoint (head grid position) for server click events. */
  getHeadGridPos(): GridPos {
    return this.data.waypoints[this.data.waypoints.length - 1];
  }

  occupiesWaypointCell(x: number, y: number): boolean {
    return this.data.waypoints.some((wp) => wp.x === x && wp.y === y);
  }

  sharesWaypointPathWith(other: Arrow): boolean {
    return this.data.waypoints.some((wp) =>
      other.occupiesWaypointCell(wp.x, wp.y),
    );
  }

  /**
   * Force-revert an already-moving arrow when server reconciliation says the
   * click was invalid. No-op if already reversing or cleared.
   */
  forceRevert(useFastReverse: boolean = false) {
    if (this.isCleared || !this.isMoving) return;

    this.awaitingServerAck = false;
    this.serverBlockedVisualOnly = false;
    this.serverBlockedReverseAtDist = null;
    this.serverBlockedMaxForwardMs = 0;
    this.hasHitBlocker = true;
    this.isReversing = true;
    this.reverseSpeedMultiplier = useFastReverse
      ? Math.max(this.reverseSpeedMultiplier, FAST_REVERSE_MULTIPLIER)
      : Math.max(this.reverseSpeedMultiplier, NORMAL_REVERSE_MULTIPLIER);
    this.flashTimer = FLASH_MS;
    this.scene.onCollisionGlow();
    this.draw();
  }

  // ── start ────────────────────────────────────────────────────────────────
  startMoving(serverControlled = false) {
    if (this.isMoving || this.isCleared) return;
    this.isMoving = true;
    this.headDist = this.totalLen;
    this.tailDist = 0;
    this.hasHitBlocker = false;
    this.isReversing = false;
    this.reverseSpeedMultiplier = NORMAL_REVERSE_MULTIPLIER;
    this.moveTime = 0;
    this.slitherTime = 0;
    this.anticipationTimer = SNAKE_MOTION.anticipationMs / 1000;
    this.clearBurstTimer = 0;
    this.awaitingServerAck = serverControlled;
    this.serverBlockedVisualOnly = false;
    this.serverBlockedReverseAtDist = null;
    this.serverBlockedMaxForwardMs = 0;
  }

  confirmServerMove() {
    this.awaitingServerAck = false;
    this.serverBlockedVisualOnly = false;
    this.serverBlockedReverseAtDist = null;
    this.serverBlockedMaxForwardMs = 0;
  }

  applyServerBlocked() {
    if (this.isCleared || !this.isMoving || this.isReversing) return;

    this.awaitingServerAck = false;
    this.serverBlockedVisualOnly = true;
    this.serverBlockedReverseAtDist =
      Math.max(this.headDist, this.totalLen) +
      this.cell * SERVER_BLOCKED_VISUAL_EXTRA_CELLS;
    this.serverBlockedMaxForwardMs = SERVER_BLOCKED_VISUAL_MAX_MS;
  }

  // ── update (called every frame) ──────────────────────────────────────────
  update(delta: number, occ: Map<string, Arrow>, gridW: number, gridH: number) {
    let timersChanged = false;

    if (this.introActive) {
      if (this.introDelay > 0) {
        this.introDelay = Math.max(0, this.introDelay - delta);
        return;
      }

      const introLen = Math.max(this.totalLen, 1);
      this.introProgress = Math.min(
        1,
        this.introProgress +
        (this.cell * INTRO_CELLS_PER_SEC * delta) / 1000 / introLen,
      );

      if (this.introProgress >= 1) {
        this.introProgress = 1;
        this.introActive = false;
        this.introPopTimer = INTRO_HEAD_POP_MS;
      }

      this.draw();
      return;
    }

    // Flash timer
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) this.flashTimer = 0;
      timersChanged = true;
    }

    // Hint timer
    if (this.hintTimer > 0) {
      this.hintTimer -= delta;
      if (this.hintTimer <= 0) this.hintTimer = 0;
      timersChanged = true;
    }

    if (this.introPopTimer > 0) {
      this.introPopTimer = Math.max(0, this.introPopTimer - delta);
      timersChanged = true;
    }

    if (this.anticipationTimer > 0) {
      this.anticipationTimer = Math.max(
        0,
        this.anticipationTimer - delta / 1000,
      );
      timersChanged = true;
    }

    if (this.clearBurstTimer > 0) {
      this.clearBurstTimer = Math.max(0, this.clearBurstTimer - delta / 1000);
      timersChanged = true;
    }

    if (!this.isMoving || this.isCleared) {
      if (timersChanged) this.draw();
      return;
    }

    const baseSpeed = this.cell * MOVE_CELLS_PER_SEC;

    if (this.isReversing) {
      // Head retreats quickly so collision handoffs feel like actual arrow hits.
      const reverseSpeed = baseSpeed * this.reverseSpeedMultiplier;
      const dmRev = reverseSpeed * (delta / 1000);

      this.headDist -= dmRev;
      if (this.tailDist > 0) this.tailDist = Math.max(0, this.tailDist - dmRev);

      if (this.headDist <= this.totalLen) {
        this.headDist = this.totalLen;
        this.tailDist = 0;
        this.isMoving = false;
        this.isReversing = false;
        this.hasHitBlocker = false;
        this.reverseSpeedMultiplier = NORMAL_REVERSE_MULTIPLIER;
        this.awaitingServerAck = false;
        this.serverBlockedVisualOnly = false;
        this.serverBlockedReverseAtDist = null;
        this.serverBlockedMaxForwardMs = 0;
      }
    } else {
      this.slitherTime += delta / 1000;
      let currentSpeed: number;
      if (this.scene.isServerModeActive() || this.awaitingServerAck) {
        currentSpeed = baseSpeed * SERVER_FORWARD_SPEED_MULTIPLIER;
      } else if (this.scene.isDemoMoveArrow(this)) {
        currentSpeed = baseSpeed * DEMO_FORWARD_SPEED_MULTIPLIER;
      } else if (this.scene.isAutoPlayArrow(this)) {
        currentSpeed = baseSpeed * AUTOPLAY_FORWARD_SPEED_MULTIPLIER;
      } else {
        // Track time spent moving forward for exponential speed
        this.moveTime += delta / 1000;
        const progress = Math.min(1, this.moveTime / 0.5); // Reaches max speed in 0.5s
        const speedMultiplier = 0.08 + 0.92 * Math.pow(progress, 3); // Exponential curve from 8% to 100% speed
        currentSpeed = baseSpeed * speedMultiplier;
      }
      const dm = currentSpeed * (delta / 1000);

      // Head leads forward; tail follows once head is past the path
      this.headDist += dm;
      if (this.headDist > this.totalLen) this.tailDist += dm;

      if (this.serverBlockedVisualOnly) {
        this.serverBlockedMaxForwardMs = Math.max(
          0,
          this.serverBlockedMaxForwardMs - delta,
        );
        const reachedBlockedBeatDistance =
          this.serverBlockedReverseAtDist !== null &&
          this.headDist >= this.serverBlockedReverseAtDist;
        const blockedBeatExpired = this.serverBlockedMaxForwardMs <= 0;

        if (reachedBlockedBeatDistance || blockedBeatExpired) {
          this.forceRevert(true);
          return;
        }

        this.draw();
        return;
      }

      // ── collision check: does the immediate next cell block us? ────────────────
      if (!this.hasHitBlocker && this.headDist > this.totalLen) {
        const extendDist = this.headDist - this.totalLen;
        const currentStep = Math.max(
          1,
          Math.ceil(extendDist / this.cell + 0.5),
        );

        let blocked = false;
        let hitTarget: Arrow | null = null;

        for (let s = 1; s <= currentStep; s++) {
          const gCell = this.gridCellAtStep(s);
          const inBounds =
            gCell.x >= 0 && gCell.x < gridW && gCell.y >= 0 && gCell.y < gridH;
          if (!inBounds) continue;

          const blockingArrow = occ.get(cellKey(gCell.x, gCell.y));
          if (!blockingArrow || blockingArrow === this) continue;

          // ── Step 1: Grid-boundary distance gate (same as before) ──
          const collisionDist = (s - 0.45) * this.cell;
          if (extendDist < collisionDist) continue;

          // ── Step 2: World-space body confirmation ──────────────────
          // For a MOVING blocker: the occ map cell may already be vacated
          // visually. Confirm by checking if this arrow's head actually
          // overlaps the blocker's rendered body in world space.
          if (blockingArrow.isMoving && !blockingArrow.isReturningToPath()) {
            if (blockingArrow.willClear(occ, gridW, gridH)) {
              continue;
            }
            const myHead = this.posAt(this.headDist);
            if (!blockingArrow.bodyContainsWorldPoint(myHead.x, myHead.y)) {
              // Blocker has moved out — not a real collision for this cell.
              continue;
            }
          }

          // ── Step 3: Cleared arrows are no obstacle ─────────────────
          if (blockingArrow.isCleared) continue;

          blocked = true;
          hitTarget = blockingArrow;
          break;
        }

        if (blocked) {
          const collidedWithReturningArrow =
            hitTarget?.isMoving && hitTarget.isReturningToPath();

          if (collidedWithReturningArrow && hitTarget) {
            hitTarget.forceRevert(true);
          }

          this.forceRevert(false);
          if (hitTarget) hitTarget.triggerFlash(200);
          this.scene.onArrowBlocked(this);
          return;
        }
      }

      // ── fully exited: tail has cleared the grid boundary ──
      if (this.tailDist > this.totalLen + this.exitDist) {
        this.isCleared = true;
        this.isMoving = false;
        this.clearBurstTimer = SNAKE_MOTION.clearBurstMs / 1000;
        this.scene.onArrowCleared(this);
      }
    }

    this.draw();
  }

  // ── drawing ──────────────────────────────────────────────────────────────
  draw() {
    this.gfx.clear();
    this.activeBodySpriteCount = 0;

    let color = this.data.color;
    if (this.flashTimer > 0) {
      color = THEME.danger;
    } else if (this.hintTimer > 0) {
      if (Math.floor(this.hintTimer / 150) % 2 === 0) {
        color = THEME.hint;
      }
    }

    if (this.introActive && this.introProgress <= 0) {
      this.hideHeadSprite();
      this.hideTailSprite();
      this.hideUnusedBodySprites();
      return;
    }

    if (this.isCleared) {
      if (this.clearBurstTimer > 0) this.drawClearBurst(color);
      this.hideHeadSprite();
      this.hideTailSprite();
      this.hideUnusedBodySprites();
      return;
    }

    const renderTailDist = this.introActive ? 0 : this.tailDist;
    const renderHeadDist = this.introActive
      ? this.totalLen * this.introProgress
      : this.headDist;

    const headP = this.snakeVisualPointAt(
      renderHeadDist,
      renderTailDist,
      renderHeadDist,
    );

    const headSpacing = this.ahs * 0.5;

    const bodyHeadDist = Math.max(renderTailDist, renderHeadDist - headSpacing);
    // ── rounded body polyline ──
    this.drawExitTrail(renderTailDist, bodyHeadDist, color);
    this.drawTailCap(renderTailDist, bodyHeadDist, color);
    this.drawSegmentedBody(renderTailDist, bodyHeadDist, color);
    // ── chevron arrowhead at head ──
    if (!this.introActive || this.introProgress > 0.9) {
      const popScale =
        this.introPopTimer > 0
          ? 1 + 0.28 * (this.introPopTimer / INTRO_HEAD_POP_MS)
          : 1;
      this.drawSnakeHead(headP, color, popScale);
    } else {
      this.hideHeadSprite();
    }
    this.hideUnusedBodySprites();
  }

  private drawExitTrail(
    renderTailDist: number,
    renderHeadDist: number,
    color: number,
  ) {
    if (
      SNAKE_MOTION.trailCount <= 0 ||
      !this.isMoving ||
      this.isReversing ||
      this.serverBlockedVisualOnly ||
      renderHeadDist <= this.totalLen
    ) {
      return;
    }

    const visibleLen = Math.max(0, renderHeadDist - renderTailDist);
    if (visibleLen <= 0) return;

    const beadRadius = Math.max(
      this.vc * SNAKE_MOTION.beadRadiusCell,
      this.lw * 0.9,
    );
    const segmentCount = Math.max(4, Math.ceil(visibleLen / (this.cell * 0.6)));
    const trailColor = mixColor(color, 0xffffff, 0.2);

    for (let ghost = SNAKE_MOTION.trailCount; ghost >= 1; ghost--) {
      const alpha =
        SNAKE_MOTION.trailAlpha *
        ((SNAKE_MOTION.trailCount - ghost + 1) / SNAKE_MOTION.trailCount);
      const phaseHeadDist =
        this.headDist - ghost * SNAKE_MOTION.trailPhaseCells * this.cell;

      this.gfx.lineStyle(
        beadRadius * SNAKE_MOTION.trailStrokeRadius,
        trailColor,
        alpha,
      );
      this.gfx.beginPath();
      for (let i = 0; i <= segmentCount; i++) {
        const dist = renderTailDist + (visibleLen * i) / segmentCount;
        const p = this.snakeVisualPointAt(
          dist,
          renderTailDist,
          renderHeadDist,
          phaseHeadDist,
        );
        if (i === 0) this.gfx.moveTo(p.x, p.y);
        else this.gfx.lineTo(p.x, p.y);
      }
      this.gfx.strokePath();
    }
  }

  private drawSegmentedBody(
    renderTailDist: number,
    renderHeadDist: number,
    color: number,
  ) {
    const headSize = Math.max(
      this.vc * SNAKE_MOTION.headRadiusCell,
      this.ahs * 0.52,
    );

    const squareSize = headSize * 1;

    const beadRadius = squareSize * 0.56;
    const beadSpacing = beadRadius * 1.1;
    const tailOffset =
      this.scene.textures.exists(SNAKE_TAIL_TEXTURE_KEY) &&
        this.tailSpriteWidth > 0
        ? this.tailSpriteWidth
        : beadRadius * SNAKE_MOTION.bodySpriteScale * 0.52;
    const bodyTailDist = Math.min(renderHeadDist, renderTailDist + tailOffset);
    const visibleLen = Math.max(0, renderHeadDist - bodyTailDist);
    if (visibleLen <= 0) return;
    const segmentCount = Math.max(2, Math.ceil(visibleLen / beadSpacing));

    if (this.scene.textures.exists(BODY_SEGMENT_TEXTURE_KEY)) {
      const spriteSize = beadRadius * SNAKE_MOTION.bodySpriteScale;

      for (let i = 0; i <= segmentCount; i++) {
        const dist = bodyTailDist + (visibleLen * i) / segmentCount;
        const p = this.snakeVisualPointAt(dist, renderTailDist, renderHeadDist);
        const scale = 1;
        const sprite = this.getBodySprite(this.activeBodySpriteCount++);

        const displaySize = Math.max(1, Math.round(spriteSize * scale));

        sprite
          .setPosition(p.x, p.y)
          .setDisplaySize(displaySize, displaySize)
          .setTint(color)
          .setAlpha(1)
          .setVisible(true);
      }

      return;
    }

    const outline = mixColor(color, 0x000000, 0.22);
    const shadow = mixColor(color, 0x000000, 0.42);

    this.gfx.lineStyle(beadRadius * 0.34, shadow, 0.2);
    this.gfx.beginPath();
    for (let i = 0; i <= segmentCount; i++) {
      const dist = bodyTailDist + (visibleLen * i) / segmentCount;
      const p = this.snakeVisualPointAt(dist, renderTailDist, renderHeadDist);
      if (i === 0) this.gfx.moveTo(p.x, p.y + beadRadius * 0.18);
      else this.gfx.lineTo(p.x, p.y + beadRadius * 0.18);
    }
    this.gfx.strokePath();

    for (let i = segmentCount; i >= 0; i--) {
      const dist = bodyTailDist + (visibleLen * i) / segmentCount;
      const p = this.snakeVisualPointAt(dist, renderTailDist, renderHeadDist);
      const radius = beadRadius;
      this.gfx.fillStyle(outline, 1);
      this.gfx.fillCircle(p.x, p.y, radius * 1.08);
      this.gfx.fillStyle(color, 1);
      this.gfx.fillCircle(p.x, p.y, radius);
    }
  }

  private getBodySprite(index: number): Phaser.GameObjects.Image {
    let sprite = this.bodySprites[index];

    if (!sprite) {
      sprite = this.scene.add.image(0, 0, BODY_SEGMENT_TEXTURE_KEY);
      sprite.setOrigin(0.5);
      sprite.setDepth(9);
      sprite.setVisible(false);
      this.bodySprites[index] = sprite;
    }

    return sprite;
  }

  private hideUnusedBodySprites() {
    for (let i = this.activeBodySpriteCount; i < this.bodySprites.length; i++) {
      this.bodySprites[i].setVisible(false);
    }
  }

  private hideHeadSprite() {
    this.headSprite.setVisible(false);
  }

  private hideTailSprite() {
    this.tailSprite.setVisible(false);
  }

  private snakeVisualPointAt(
    dist: number,
    renderTailDist: number,
    renderHeadDist: number,
    phaseHeadDist = this.headDist,
  ): { x: number; y: number } {
    const p = this.posAt(dist);
    if (
      !this.isMoving ||
      this.isReversing ||
      this.hasHitBlocker ||
      this.serverBlockedVisualOnly ||
      renderHeadDist <= this.totalLen
    ) {
      return p;
    }

    const visibleLen = Math.max(renderHeadDist - renderTailDist, 1);
    const cellSize = Math.max(this.cell, 1);
    const bodyT = Phaser.Math.Clamp((dist - renderTailDist) / visibleLen, 0, 1);
    const turnInfluence = this.turnInfluenceAt(dist);
    const broadSample = Phaser.Math.Clamp(
      visibleLen * 0.18,
      this.cell * SNAKE_MOTION.directionSampleMinCells,
      this.cell * SNAKE_MOTION.directionSampleMaxCells,
    );
    const sample = Phaser.Math.Linear(
      broadSample,
      this.cell * SNAKE_MOTION.cornerSampleCells,
      turnInfluence,
    );
    const before = this.posAt(Math.max(renderTailDist, dist - sample));
    const after = this.posAt(Math.min(renderHeadDist, dist + sample));
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const waveLengthCells = Phaser.Math.Linear(
      SNAKE_MOTION.waveLengthStraightCells,
      SNAKE_MOTION.waveLengthCornerCells,
      turnInfluence,
    );
    const lengthCells = visibleLen / cellSize;
    const waveCycles = Phaser.Math.Clamp(
      lengthCells / waveLengthCells,
      SNAKE_MOTION.waveCycleMin,
      SNAKE_MOTION.waveCycleMax,
    );
    const travelPhase = (phaseHeadDist / cellSize) * SNAKE_MOTION.phaseSpeed;
    const bodyPhase = (1 - bodyT) * Math.PI * 2 * waveCycles;
    const wave =
      Math.sin(bodyPhase - travelPhase) +
      Math.sin(bodyPhase * 1.85 - travelPhase * 1.12) *
      SNAKE_MOTION.cornerHarmonicStrength *
      turnInfluence;
    const distanceBehindHeadCells = (renderHeadDist - dist) / cellSize;
    const slitherReachCells =
      SNAKE_MOTION.slitherOnsetStartCells +
      this.slitherTime * SNAKE_MOTION.slitherOnsetCellsPerSec;
    const onset = Phaser.Math.Clamp(
      (slitherReachCells - distanceBehindHeadCells) /
      SNAKE_MOTION.slitherOnsetBlendCells,
      0,
      1,
    );
    const exitAmount = Phaser.Math.Clamp(
      (renderHeadDist - this.totalLen) / Math.max(this.cell * 1.4, 1),
      0,
      1,
    );
    const bodyEnvelope = Math.pow(
      Math.max(0.36, Math.sin(Math.PI * bodyT)),
      0.72,
    );
    const headSwing = Phaser.Math.Linear(
      0.62,
      1,
      Phaser.Math.Clamp((1 - bodyT) / 0.28, 0, 1),
    );
    const tailSwing = Phaser.Math.Linear(
      0.68,
      1,
      Phaser.Math.Clamp(bodyT / 0.24, 0, 1),
    );
    const longBodyDamping = Phaser.Math.Linear(
      1,
      SNAKE_MOTION.longBodyDampingMin,
      Phaser.Math.Clamp(
        (lengthCells - SNAKE_MOTION.longBodyDampingStartCells) /
        SNAKE_MOTION.longBodyDampingRangeCells,
        0,
        1,
      ),
    );
    const anticipationDuration = SNAKE_MOTION.anticipationMs / 1000;
    const anticipationProgress =
      anticipationDuration > 0
        ? 1 - this.anticipationTimer / anticipationDuration
        : 1;
    const anticipationPush =
      this.anticipationTimer > 0
        ? Math.sin(Phaser.Math.Clamp(anticipationProgress, 0, 1) * Math.PI) *
        this.cell *
        SNAKE_MOTION.anticipationCells
        : 0;
    const amplitude =
      this.vc *
      SNAKE_MOTION.baseAmplitudeCell *
      Phaser.Math.Linear(1, SNAKE_MOTION.cornerAmplitudeBoost, turnInfluence) *
      this.pathTurnDamping *
      longBodyDamping *
      onset *
      exitAmount *
      bodyEnvelope *
      headSwing *
      tailSwing;

    return {
      x: p.x + (dx / len) * anticipationPush + nx * wave * amplitude,
      y: p.y + (dy / len) * anticipationPush + ny * wave * amplitude,
    };
  }

  private drawTailCap(
    renderTailDist: number,
    renderHeadDist: number,
    color: number,
  ) {
    if (this.scene.textures.exists(SNAKE_TAIL_TEXTURE_KEY)) {
      this.drawSnakeTail(renderTailDist, renderHeadDist, color);
      return;
    }

    const tail = this.snakeVisualPointAt(
      renderTailDist,
      renderTailDist,
      renderHeadDist,
    );
    const forward = this.snakeVisualPointAt(
      Math.min(renderHeadDist, renderTailDist + this.cell * 0.45),
      renderTailDist,
      renderHeadDist,
    );
    const dx = forward.x - tail.x;
    const dy = forward.y - tail.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const tip = this.vc * SNAKE_MOTION.tailTipCell;
    const shoulder = this.vc * SNAKE_MOTION.tailShoulderCell;
    const outline = mixColor(color, 0x000000, 0.22);
    const highlight = mixColor(color, 0xffffff, 0.3);

    const backX = tail.x - ux * tip;
    const backY = tail.y - uy * tip;
    const leftX = tail.x + ux * tip * 0.28 + px * shoulder;
    const leftY = tail.y + uy * tip * 0.28 + py * shoulder;
    const rightX = tail.x + ux * tip * 0.28 - px * shoulder;
    const rightY = tail.y + uy * tip * 0.28 - py * shoulder;

    this.gfx.fillStyle(outline, 1);
    this.gfx.beginPath();
    this.gfx.moveTo(backX - ux * tip * 0.12, backY - uy * tip * 0.12);
    this.gfx.lineTo(leftX + px * shoulder * 0.12, leftY + py * shoulder * 0.12);
    this.gfx.lineTo(
      rightX - px * shoulder * 0.12,
      rightY - py * shoulder * 0.12,
    );
    this.gfx.closePath();
    this.gfx.fillPath();

    this.gfx.fillStyle(color, 1);
    this.gfx.beginPath();
    this.gfx.moveTo(backX, backY);
    this.gfx.lineTo(leftX, leftY);
    this.gfx.lineTo(rightX, rightY);
    this.gfx.closePath();
    this.gfx.fillPath();

    this.gfx.fillStyle(highlight, 0.36);
    this.gfx.fillCircle(
      tail.x - ux * tip * 0.1 - px * shoulder * 0.2,
      tail.y - uy * tip * 0.1 - py * shoulder * 0.2,
      Math.max(1.2, shoulder * 0.28),
    );
  }

  private drawSnakeTail(
    renderTailDist: number,
    renderHeadDist: number,
    color: number,
  ) {
    if (renderHeadDist <= renderTailDist) {
      this.hideTailSprite();
      return;
    }

    const tail = this.snakeVisualPointAt(
      renderTailDist,
      renderTailDist,
      renderHeadDist,
    );
    const forward = this.snakeVisualPointAt(
      Math.min(renderHeadDist, renderTailDist + this.cell * 0.45),
      renderTailDist,
      renderHeadDist,
    );
    const dx = forward.x - tail.x;
    const dy = forward.y - tail.y;
    const beadRadius = Math.max(
      this.vc * SNAKE_MOTION.beadRadiusCell,
      this.lw * 0.9,
    );
    const height = Math.max(5, Math.round(beadRadius * 1.36));
    const width = Math.max(8, Math.round(height * SNAKE_TAIL_ASPECT));
    this.tailSpriteWidth = width;

    this.tailSprite
      .setPosition(tail.x, tail.y)
      .setRotation(Math.atan2(-dy, -dx))
      .setTint(color)
      .setDisplaySize(width, height)
      .setVisible(true);
  }

  private drawTongue(pos: { x: number; y: number }) {
    const { sx, sy } = screenDir(this.data.headDirection);

    const px = -sy;
    const py = sx;

    const radius = Math.max(
      this.vc * SNAKE_MOTION.headRadiusCell,
      this.ahs * 0.52,
    );

    // tongue start near mouth/base
    const startX = pos.x + sx * radius * 1.4;

    const startY = pos.y + sy * radius * 1.4;

    // tongue length
    const tongueLen = radius * 0.18;

    // tongue end
    const endX = startX + sx * tongueLen;

    const endY = startY + sy * tongueLen;

    // fork size
    const forkSize = radius * 0.2;

    // main tongue
    this.gfx.lineStyle(Math.max(2, radius * 0.08), 0xff4d7a, 1);

    this.gfx.beginPath();
    this.gfx.moveTo(startX, startY);
    this.gfx.lineTo(endX, endY);
    this.gfx.strokePath();

    // left fork
    this.gfx.beginPath();
    this.gfx.moveTo(endX, endY);

    this.gfx.lineTo(
      endX + sx * forkSize + px * forkSize,
      endY + sy * forkSize + py * forkSize,
    );

    this.gfx.strokePath();

    // right fork
    this.gfx.beginPath();
    this.gfx.moveTo(endX, endY);

    this.gfx.lineTo(
      endX + sx * forkSize - px * forkSize,
      endY + sy * forkSize - py * forkSize,
    );

    this.gfx.strokePath();
  }

  private drawArrowhead(
    pos: { x: number; y: number },
    color: number,
    scale = 1,
  ) {
    const { sx, sy } = screenDir(this.data.headDirection);

    // perpendicular direction
    const px = -sy;
    const py = sx;

    const size =
      Math.max(this.vc * SNAKE_MOTION.headRadiusCell, this.ahs * 0.52) *
      scale *
      1.4;

    const shine = mixColor(color, 0xffffff, 0.35);

    const drawShape = (
      cx: number,
      cy: number,
      fillColor: number,
      alpha = 1,
    ) => {
      // Aspect ratio for triangle
      const widthScale = 0.965;
      const heightScale = 1;

      // rear sharp point (toward body)
      const tip = new Phaser.Math.Vector2(
        cx - sx * size * heightScale,
        cy - sy * size * heightScale,
      );

      const left = new Phaser.Math.Vector2(
        cx + sx * size * heightScale + px * size * widthScale,

        cy + sy * size * heightScale + py * size * widthScale,
      );

      const right = new Phaser.Math.Vector2(
        cx + sx * size * heightScale - px * size * widthScale,

        cy + sy * size * heightScale - py * size * widthScale,
      );

      // rounded corner helper
      const roundCorner = (
        a: Phaser.Math.Vector2,
        b: Phaser.Math.Vector2,
        c: Phaser.Math.Vector2,
        radius: number,
        steps = 8,
      ) => {
        const ab = new Phaser.Math.Vector2(a.x - b.x, a.y - b.y).normalize();

        const cb = new Phaser.Math.Vector2(c.x - b.x, c.y - b.y).normalize();

        const p1 = new Phaser.Math.Vector2(
          b.x + ab.x * radius,
          b.y + ab.y * radius,
        );

        const p2 = new Phaser.Math.Vector2(
          b.x + cb.x * radius,
          b.y + cb.y * radius,
        );

        const pts: Phaser.Math.Vector2[] = [];

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const mt = 1 - t;

          pts.push(
            new Phaser.Math.Vector2(
              mt * mt * p1.x + 2 * mt * t * b.x + t * t * p2.x,

              mt * mt * p1.y + 2 * mt * t * b.y + t * t * p2.y,
            ),
          );
        }

        return pts;
      };

      const radius = size * 0.6;
      const squareSize = size * 0.8;
      const squareCenterX = cx - sx * size * 0.1;

      const squareCenterY = cy - sy * size * 0.1;
      const squareX = squareCenterX - squareSize / 2;

      const squareY = squareCenterY - squareSize / 2;

      // create rounded corners
      const corner1 = roundCorner(right, tip, left, radius);

      const corner2 = roundCorner(tip, left, right, radius);

      const corner3 = roundCorner(left, right, tip, radius);

      // combine in proper winding order
      const points = [...corner1, ...corner2, ...corner3];

      // draw shape
      this.gfx.fillStyle(fillColor, alpha);
      this.gfx.fillPoints(points, true);

      this.gfx.fillStyle(fillColor, alpha);
      this.gfx.fillRoundedRect(
        squareX,
        squareY,
        squareSize,
        squareSize,
        squareSize * 0.22,
      );

      // subtle highlight
      const shinePoints = [
        new Phaser.Math.Vector2(cx + sx * size * 0.45, cy + sy * size * 0.45),

        new Phaser.Math.Vector2(cx + px * size * 0.12, cy + py * size * 0.12),

        new Phaser.Math.Vector2(cx - px * size * 0.12, cy - py * size * 0.12),
      ];

      this.gfx.fillStyle(shine, 0.12);
      this.gfx.fillPoints(shinePoints, true);
    };

    // subtle shadow/depth
    drawShape(
      pos.x - sx * size * 0.06,
      pos.y - sy * size * 0.06,
      0x000000,
      0.16,
    );

    // main head
    drawShape(pos.x, pos.y, color, 1);
  }

  private drawSnakeHead(
    pos: { x: number; y: number },
    color: number,
    scale = 1,
  ) {
    if (!this.scene.textures.exists(SNAKE_HEAD_TEXTURE_KEY)) {
      this.hideHeadSprite();
      this.drawArrowhead(pos, color, scale);
      this.drawTongue(pos);
      return;
    }

    const { sx, sy } = screenDir(this.data.headDirection);
    const radius = Math.max(
      this.vc * SNAKE_MOTION.headRadiusCell,
      this.ahs * 0.52,
    );
    const height = Math.max(10, Math.round(radius * 3 * scale));
    const width = Math.max(8, Math.round(height * SNAKE_HEAD_ASPECT));

    const textureKey = this.scene.getSnakeHeadTextureKey(color);
    this.headSprite
      .setTexture(textureKey)
      .setOrigin(0.5)
      .setPosition(pos.x, pos.y)
      .setRotation(Math.atan2(sy, sx) - Math.PI / 2)
      .setDisplaySize(width, height)
      .setVisible(true);

    if (textureKey === SNAKE_HEAD_TEXTURE_KEY) {
      this.headSprite.setTint(color);
    } else {
      this.headSprite.clearTint();
    }
  }

  private drawClearBurst(color: number) {
    const duration = SNAKE_MOTION.clearBurstMs / 1000;
    const progress = duration > 0 ? 1 - this.clearBurstTimer / duration : 1;
    const t = Phaser.Math.Clamp(progress, 0, 1);
    const origin = this.posAt(this.totalLen + this.exitDist * 0.42);
    const alpha = (1 - t) * 0.75;
    const radius = this.vc * SNAKE_MOTION.clearBurstRadiusCells * t;
    const dotRadius = Math.max(1.4, this.vc * 0.055 * (1 - t * 0.35));
    const sparkleColor = mixColor(color, 0xffffff, 0.35);

    for (let i = 0; i < SNAKE_MOTION.clearBurstParticles; i++) {
      const angle =
        (Math.PI * 2 * i) / SNAKE_MOTION.clearBurstParticles + t * 0.8;
      const spread = radius * (0.55 + (i % 3) * 0.18);
      this.gfx.fillStyle(i % 2 === 0 ? sparkleColor : color, alpha);
      this.gfx.fillCircle(
        origin.x + Math.cos(angle) * spread,
        origin.y + Math.sin(angle) * spread,
        dotRadius,
      );
    }
  }

  // ── direction guide ──────────────────────────────────────────────────────
  showGuide() {
    if (this.isCleared || this.isMoving) return;
    this.guideGfx.clear();
    const head = this.worldPts[this.worldPts.length - 1];
    const { sx, sy } = screenDir(this.data.headDirection);
    const far = {
      x: head.x + sx * this.cell * 25,
      y: head.y + sy * this.cell * 25,
    };
    this.guideGfx.lineStyle(1.5, THEME.gold, 0.45);
    this.guideGfx.beginPath();
    this.guideGfx.moveTo(head.x, head.y);
    this.guideGfx.lineTo(far.x, far.y);
    this.guideGfx.strokePath();
  }

  hideGuide() {
    this.guideGfx.clear();
  }

  destroy() {
    this.headSprite.destroy();
    this.tailSprite.destroy();
    for (const sprite of this.bodySprites) sprite.destroy();
    this.gfx.destroy();
    this.guideGfx.destroy();
  }
}

// ─── GameScene ────────────────────────────────────────────────────────────────
export class GameScene extends Phaser.Scene {
  private arrows: Arrow[] = [];
  private occupancy: Map<string, Arrow> = new Map();
  private availableHints = MAX_HINTS;
  private levelIdx = 0;
  private isActive = true;
  private introInProgress = false;
  private guidesOn = false;
  private hintIndex = -1;

  private cellPx = 60;
  private offX = 0;
  private offY = 0;
  private snakeScale = 1;
  private zoomMin = 0.15;
  private zoomMax = 2.5;
  private zoomDefault = 1; // initial zoom for this level (slider = 50)
  private readonly PAN_EDGE_BUFFER_CELLS = 2.5;

  // ── Server mode ──────────────────────────────────────────────────────────
  private isServerMode = false;
  private currentLevelData: LevelData | null = null;
  private autoPlayEnabled = false;
  private autoPlayCurrentArrow: Arrow | null = null;
  private demoMoveCurrentArrow: Arrow | null = null;
  private isDemoRunning = false;

  // ── Pan / drag state ─────────────────────────────────────────────────────
  private panActive = false;
  private panStartX = 0;
  private panStartY = 0;
  private panCamScrollX = 0;
  private panCamScrollY = 0;
  private panMoved = false;
  private readonly PAN_THRESHOLD = 5;

  // ── Sounds ───────────────────────────────────────────────────────────────
  private bgMusic?: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
  private tapSound?: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
  private successSound?:
    | Phaser.Sound.WebAudioSound
    | Phaser.Sound.HTML5AudioSound;
  private wrongStepSound?:
    | Phaser.Sound.WebAudioSound
    | Phaser.Sound.HTML5AudioSound;
  private whooshSound?:
    | Phaser.Sound.WebAudioSound
    | Phaser.Sound.HTML5AudioSound;

  private readonly BASE_MUSIC_VOL = 0.35;
  private readonly BASE_TAP_VOL = 0.7;
  private readonly BASE_SUCCESS_VOL = 1.0;
  private readonly BASE_WRONG_VOL = 0.8;
  private readonly BASE_WHOOSH_VOL = 0.5;
  private musicVolMul = 1.0;
  private sfxVolMul = 1.0;
  private fpsText: Phaser.GameObjects.Text | null = null;
  private fpsTextTimer = 0;
  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    this.load.svg(BODY_SEGMENT_TEXTURE_KEY, BODY_SEGMENT_TEXTURE_PATH, {
      width: BODY_SEGMENT_TEXTURE_SIZE,
      height: BODY_SEGMENT_TEXTURE_SIZE,
    });
    this.load.svg(SNAKE_HEAD_TEXTURE_KEY, SNAKE_HEAD_TEXTURE_PATH, {
      width: SNAKE_HEAD_TEXTURE_WIDTH,
      height: SNAKE_HEAD_TEXTURE_HEIGHT,
    });
    this.load.svg(SNAKE_TAIL_TEXTURE_KEY, SNAKE_TAIL_TEXTURE_PATH, {
      width: SNAKE_TAIL_TEXTURE_WIDTH,
      height: SNAKE_TAIL_TEXTURE_HEIGHT,
    });
    this.load.audio("bg-music", "/assets/sounds/background_sound.mp3");
    this.load.audio("tap", "/assets/sounds/tap_sound.mp3");

    this.load.audio("success", "/assets/sounds/success_sound.mp3");
    this.load.audio("wrong-step", "/assets/sounds/wrong_step.mp3");
    this.load.audio("whoosh", "/assets/sounds/whoosh_sound.mp3");
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────
  create() {
    this.textures
      .get(BODY_SEGMENT_TEXTURE_KEY)
      .setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures
      .get(SNAKE_HEAD_TEXTURE_KEY)
      .setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures
      .get(SNAKE_TAIL_TEXTURE_KEY)
      .setFilter(Phaser.Textures.FilterMode.LINEAR);
    if (DEBUG_MODE_ENABLED) {
      this.fpsText = this.add.text(10, 10, "", {
        color: "#ffffff",
        fontSize: "16px",
      });
      this.fpsText.setDepth(1000);
      this.fpsText.setScrollFactor(0);
    }
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
    this.cameras.main.setZoom(DEFAULT_BOARD_VIEW_ZOOM);
    this.setupInput();
    this.listenCommands();
    this.initSounds();
    window.dispatchEvent(new CustomEvent(GAME_EVENTS.SCENE_READY));
    const pendingServerRound = serverRoundBridge.consume();
    if (pendingServerRound) {
      this.loadServerLevel(pendingServerRound);
      return;
    }
    if (LEVELS.length > 0) {
      this.loadLevel(0);
    }
  }

  private prewarmHeadTextures(arrows: ArrowPathData[]) {
    const seen = new Set<number>();
    for (const ap of arrows) {
      if (!seen.has(ap.color)) {
        seen.add(ap.color);
        this.getSnakeHeadTextureKey(ap.color);
      }
    }
  }

  getSnakeHeadTextureKey(color: number): string {
    const textureKey = `${SNAKE_HEAD_COLORED_TEXTURE_PREFIX}${colorTextureSuffix(color)}`;
    if (this.textures.exists(textureKey)) return textureKey;
    if (!this.textures.exists(SNAKE_HEAD_TEXTURE_KEY)) {
      return SNAKE_HEAD_TEXTURE_KEY;
    }

    const canvasTexture = this.textures.createCanvas(
      textureKey,
      SNAKE_HEAD_TEXTURE_WIDTH,
      SNAKE_HEAD_TEXTURE_HEIGHT,
    );
    if (!canvasTexture) return SNAKE_HEAD_TEXTURE_KEY;

    const baseImage = this.textures
      .get(SNAKE_HEAD_TEXTURE_KEY)
      .getSourceImage() as CanvasImageSource;
    const ctx = canvasTexture.getContext();
    ctx.clearRect(0, 0, SNAKE_HEAD_TEXTURE_WIDTH, SNAKE_HEAD_TEXTURE_HEIGHT);
    ctx.drawImage(
      baseImage,
      0,
      0,
      SNAKE_HEAD_TEXTURE_WIDTH,
      SNAKE_HEAD_TEXTURE_HEIGHT,
    );

    const imageData = ctx.getImageData(
      0,
      0,
      SNAKE_HEAD_TEXTURE_WIDTH,
      SNAKE_HEAD_TEXTURE_HEIGHT,
    );
    const pixels = imageData.data;
    const red = (color >> 16) & 0xff;
    const green = (color >> 8) & 0xff;
    const blue = color & 0xff;

    for (let i = 0; i < pixels.length; i += 4) {
      if (
        pixels[i + 3] > 0 &&
        pixels[i] >= SNAKE_HEAD_WHITE_CHANNEL_MIN &&
        pixels[i + 1] >= SNAKE_HEAD_WHITE_CHANNEL_MIN &&
        pixels[i + 2] >= SNAKE_HEAD_WHITE_CHANNEL_MIN
      ) {
        pixels[i] = red;
        pixels[i + 1] = green;
        pixels[i + 2] = blue;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    canvasTexture.refresh();
    canvasTexture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return textureKey;
  }

  update(_t: number, delta: number) {
    if (this.fpsText) {
      this.fpsTextTimer += delta;
      if (this.fpsTextTimer >= 250) {
        this.fpsText.setText(`FPS: ${Math.floor(this.game.loop.actualFps)}`);
        this.fpsTextTimer = 0;
      }
    }

    const level = this.currentLevelData ?? LEVELS[this.levelIdx];
    if (!level) return;
    this.occupancy.clear();
    for (const arrow of this.arrows) {
      arrow.populateOccupancy(this.occupancy);
    }
    for (const arrow of this.arrows) {
      arrow.update(delta, this.occupancy, level.gridSize.x, level.gridSize.y);
    }

    if (this.autoPlayEnabled) {
      this.tryAdvanceAutoPlay();
    }

    if (this.introInProgress && !this.arrows.some((a) => a.isIntroRunning())) {
      this.introInProgress = false;
      this.isActive = true;
      window.dispatchEvent(new CustomEvent(GAME_EVENTS.BOARD_READY));
    }
  }

  // ── scene resize ──────────────────────────────────────────────────────────
  onResize() {
    this.relayoutCurrentLevel();
  }

  // ── level management ──────────────────────────────────────────────────────

  private applyBoardLayout(lvl: LevelData): number {
    // Responsive padding — shrinks on narrow/mobile screens
    const pad = Math.max(8, Math.min(28, this.scale.width * 0.04));
    const availW = Math.max(1, this.scale.width - pad * 2);
    const availH = Math.max(1, this.scale.height - pad * 2);

    // Keep the 4x4 board as the visual baseline, but cap every level so the
    // whole grid remains inside the canvas even at the user's max zoom.
    const baseCellPx =
      Math.min(availW / BASE_GRID_SIZE, availH / BASE_GRID_SIZE) *
      BASE_GRID_RENDER_SCALE;
    const maxUserZoom = 0.75;
    const fitCellPx = Math.min(
      availW / Math.max(lvl.gridSize.x * maxUserZoom, 1),
      availH / Math.max(lvl.gridSize.y * maxUserZoom, 1),
    );

    this.cellPx = Math.max(1, Math.floor(Math.min(baseCellPx, fitCellPx)));

    const boardW = this.cellPx * lvl.gridSize.x;
    const boardH = this.cellPx * lvl.gridSize.y;

    // ── Adaptive initial zoom ────────────────────────────────────────────────
    // Constraint A: zoom to fit the whole board on screen at 85% fill.
    // This always takes priority — the full board must be visible.
    const boardFitZoom =
      0.85 *
      Math.min(availW / Math.max(boardW, 1), availH / Math.max(boardH, 1));

    // Constraint B: zoom so cells are at most maxVisibleCell px on screen.
    // Prevents small grids from being over-magnified (too zoomed-in).
    const screenShort = Math.min(this.scale.width, this.scale.height);
    const maxVisibleCell = Math.max(32, Math.min(52, screenShort * 0.075));
    const maxReadableZoom = maxVisibleCell / Math.max(this.cellPx, 1);

    // Take the smaller of the two: board always fits, cells never over-magnify.
    // Never magnify beyond 1:1.
    const zoom = Math.max(0.15, Math.min(boardFitZoom, maxReadableZoom, 1.0));

    // Phaser 4: midX = scrollX + width/2 (no zoom factor). With setScroll(0,0)
    // the camera always looks at world (width/2, height/2). Place the board
    // centre there so it is centred on screen regardless of zoom.
    this.offX = this.scale.width / 2 - boardW / 2;
    this.offY = this.scale.height / 2 - boardH / 2;

    // ── Snake scale: larger grids get proportionally thinner snakes so
    // adjacent paths have more visual breathing room.
    const maxDim = Math.max(lvl.gridSize.x, lvl.gridSize.y);
    this.snakeScale = Math.max(0.65, Math.min(1.0, 1.0 - (maxDim - 4) * 0.015));

    // ── Zoom bounds for this level ────────────────────────────────────────────
    // Default (initial) zoom is always slider position 50 (centre).
    this.zoomDefault = zoom;
    // Min: 30% zoom-out from the initial view — visible but not extreme.
    this.zoomMin = Math.max(0.1, zoom * 0.7);
    // Max: zoom in until ~3 cells span the screen width. Larger grids have
    // smaller cellPx so they naturally get a higher max, letting the user
    // inspect dense levels in detail.
    this.zoomMax = Math.min(4.0, availW / Math.max(this.cellPx * 3, 1));

    return zoom;
  }

  private getBoardBounds(level: LevelData) {
    return {
      minX: this.offX,
      minY: this.offY,
      maxX: this.offX + level.gridSize.x * this.cellPx,
      maxY: this.offY + level.gridSize.y * this.cellPx,
    };
  }

  private clampCameraToBoard(level: LevelData) {
    const cam = this.cameras.main;
    const zoom = Math.max(cam.zoom, 0.0001);
    const viewW = this.scale.width / zoom;
    const viewH = this.scale.height / zoom;
    const cameraHalfW = this.scale.width / 2;
    const cameraHalfH = this.scale.height / 2;
    const bounds = this.getBoardBounds(level);
    const edgeBuffer = this.cellPx * this.PAN_EDGE_BUFFER_CELLS;
    bounds.minX -= edgeBuffer;
    bounds.minY -= edgeBuffer;
    bounds.maxX += edgeBuffer;
    bounds.maxY += edgeBuffer;
    const boardW = bounds.maxX - bounds.minX;
    const boardH = bounds.maxY - bounds.minY;

    if (boardW <= viewW) {
      cam.scrollX = (bounds.minX + bounds.maxX) / 2 - cameraHalfW;
    } else {
      cam.scrollX = Phaser.Math.Clamp(
        cam.scrollX,
        bounds.minX + viewW / 2 - cameraHalfW,
        bounds.maxX - viewW / 2 - cameraHalfW,
      );
    }

    if (boardH <= viewH) {
      cam.scrollY = (bounds.minY + bounds.maxY) / 2 - cameraHalfH;
    } else {
      cam.scrollY = Phaser.Math.Clamp(
        cam.scrollY,
        bounds.minY + viewH / 2 - cameraHalfH,
        bounds.maxY - viewH / 2 - cameraHalfH,
      );
    }
  }

  private relayoutCurrentLevel() {
    const level = this.currentLevelData ?? LEVELS[this.levelIdx];
    if (!level) return;

    const zoom = this.applyBoardLayout(level);
    this.drawGrid(level.gridSize.x, level.gridSize.y);

    for (const arrow of this.arrows) {
      arrow.relayout(
        level.gridSize.x,
        this.cellPx,
        this.offX,
        this.offY,
        this.guidesOn,
        this.snakeScale,
      );
    }

    this.panActive = false;
    this.panMoved = false;
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setScroll(0, 0);
    this.refreshOccupancy();
    window.dispatchEvent(
      new CustomEvent(GAME_EVENTS.ZOOM_CHANGED, { detail: 50 }),
    );
    window.dispatchEvent(
      new CustomEvent("arrowgame:camerazoomchanged", { detail: zoom }),
    );
  }

  /** Core loader — works for both local (LEVELS) and server-provided data. */
  private loadLevelFromData(lvl: LevelData, isServer: boolean) {
    // Signal React to show loading overlay before the heavy work starts.
    window.dispatchEvent(new CustomEvent(GAME_EVENTS.LEVEL_LOADING));

    this.playBgMusic();
    this.clearArrows();
    this.autoPlayEnabled = false;
    this.autoPlayCurrentArrow = null;
    this.currentLevelData = lvl;
    this.availableHints = MAX_HINTS;
    this.isActive = false;
    this.introInProgress = true;
    this.guidesOn = false;
    this.hintIndex = -1;

    // Defer heavy setup to the next Phaser tick so the browser can paint the
    // loading overlay before the synchronous Arrow creation work begins.
    this.time.delayedCall(1, () => {
      const zoom = this.applyBoardLayout(lvl);

      // Reset camera to adaptive zoom and centered position on every level load
      // so a previous zoom-in or pan never carries over to the next level.
      this.cameras.main.setZoom(zoom);
      this.cameras.main.setScroll(0, 0);
      window.dispatchEvent(
        new CustomEvent("arrowgame:camerazoomchanged", { detail: zoom }),
      );

      this.drawGrid(lvl.gridSize.x, lvl.gridSize.y);

      this.prewarmHeadTextures(lvl.arrows);

      for (const ap of lvl.arrows) {
        if (ap.waypoints.length < 2) continue;
        const a = new Arrow(
          this,
          ap,
          lvl.gridSize.y,
          lvl.gridSize.x,
          this.cellPx,
          this.offX,
          this.offY,
          this.snakeScale,
        );
        if (ap.isRemoved) {
          a.restoreCleared();
        }
        this.arrows.push(a);
      }

      this.arrows.forEach((arrow) => {
        if (!arrow.isCleared) {
          arrow.startIntro(0);
        }
      });

      if (this.arrows.length === 0) {
        this.introInProgress = false;
        this.isActive = true;
        window.dispatchEvent(new CustomEvent(GAME_EVENTS.BOARD_READY));
      }

      this.updateHUD();
      window.dispatchEvent(
        new CustomEvent(GAME_EVENTS.LEVEL_LOAD, {
          detail: {
            level: isServer ? 0 : this.levelIdx + 1,
            hints: this.availableHints,
            total: isServer ? 0 : LEVELS.length,
            isServer,
            zoom: 50, // default view always maps to slider centre
          },
        }),
      );
    });
  }

  private loadLevel(idx: number) {
    if (!LEVELS[idx]) return;
    this.levelIdx = idx;
    this.isServerMode = false;
    this.loadLevelFromData(LEVELS[idx], false);
  }

  /** Called from React via CMD_LOAD_SERVER when the API returns board data. */
  loadServerLevel(data: ServerRoundStartData) {
    this.isServerMode = true;
    const lvl: LevelData = {
      id: 0,
      name: data.board.name,
      gridSize: data.board.gridSize,
      arrows: data.board.arrows.map((sa) => ({
        waypoints: sa.waypoints,
        headDirection: sa.headDirection,
        color: sa.color,
        arrowId: sa.arrowId,
        isRemoved: sa.isRemoved,
      })),
    };
    this.loadLevelFromData(lvl, true);
  }

  private reloadCurrentLevel() {
    if (this.isServerMode && this.currentLevelData) {
      this.loadLevelFromData(this.currentLevelData, true);
    } else {
      this.loadLevel(this.levelIdx);
    }
  }

  /** Find the arrow whose head grid position matches pos (server reconcile). */
  private findArrowByHeadPos(pos: GridPos): Arrow | null {
    for (const a of this.arrows) {
      const h = a.getHeadGridPos();
      if (h.x === pos.x && h.y === pos.y) return a;
    }
    return null;
  }

  private refreshOccupancy() {
    this.occupancy.clear();
    for (const arrow of this.arrows) {
      arrow.populateOccupancy(this.occupancy);
    }
  }

  private resolveMovingPathConflicts(incomingArrow: Arrow) {
    const level = this.currentLevelData ?? LEVELS[this.levelIdx];
    this.refreshOccupancy();

    for (const arrow of this.arrows) {
      if (
        arrow === incomingArrow ||
        arrow.isCleared ||
        !arrow.isMoving ||
        arrow.isReturningToPath()
      ) {
        continue;
      }

      if (!arrow.sharesWaypointPathWith(incomingArrow)) {
        continue;
      }

      if (arrow.willClear(this.occupancy, level.gridSize.x, level.gridSize.y)) {
        continue;
      }

      arrow.forceRevert(true);
    }
  }

  private clearArrows() {
    for (const a of this.arrows) a.destroy();
    this.arrows.length = 0;
    this.occupancy.clear();
  }

  isServerModeActive(): boolean {
    return this.isServerMode;
  }

  isAutoPlayArrow(arrow: Arrow): boolean {
    return this.autoPlayEnabled && this.autoPlayCurrentArrow === arrow;
  }

  isDemoMoveArrow(arrow: Arrow): boolean {
    return this.demoMoveCurrentArrow === arrow;
  }

  // ── sounds ────────────────────────────────────────────────────────────────
  private initSounds() {
    this.bgMusic = this.sound.add("bg-music", {
      loop: true,
      volume: this.BASE_MUSIC_VOL * this.musicVolMul,
    }) as Phaser.Sound.WebAudioSound;
    this.tapSound = this.sound.add("tap", {
      volume: this.BASE_TAP_VOL * this.sfxVolMul,
    }) as Phaser.Sound.WebAudioSound;
    this.successSound = this.sound.add("success", {
      volume: this.BASE_SUCCESS_VOL * this.sfxVolMul,
    }) as Phaser.Sound.WebAudioSound;
    this.wrongStepSound = this.sound.add("wrong-step", {
      volume: this.BASE_WRONG_VOL * this.sfxVolMul,
    }) as Phaser.Sound.WebAudioSound;
    this.whooshSound = this.sound.add("whoosh", {
      volume: this.BASE_WHOOSH_VOL * this.sfxVolMul,
    }) as Phaser.Sound.WebAudioSound;
    this.bgMusic.play();
  }

  private handleSetMusicVol = (e: Event) => {
    this.musicVolMul = (e as CustomEvent).detail as number;
    if (this.bgMusic)
      this.bgMusic.volume = this.BASE_MUSIC_VOL * this.musicVolMul;
  };

  private handleSetSfxVol = (e: Event) => {
    this.sfxVolMul = (e as CustomEvent).detail as number;
    if (this.tapSound)
      this.tapSound.volume = this.BASE_TAP_VOL * this.sfxVolMul;
    if (this.successSound)
      this.successSound.volume = this.BASE_SUCCESS_VOL * this.sfxVolMul;
    if (this.wrongStepSound)
      this.wrongStepSound.volume = this.BASE_WRONG_VOL * this.sfxVolMul;
    if (this.whooshSound)
      this.whooshSound.volume = this.BASE_WHOOSH_VOL * this.sfxVolMul;
  };

  private playBgMusic() {
    if (this.bgMusic && !this.bgMusic.isPlaying) {
      this.bgMusic.play();
    }
  }

  // ── callbacks from Arrow ──────────────────────────────────────────────────
  onArrowBlocked(_arrow: Arrow) {
    this.autoPlayEnabled = false;
    this.autoPlayCurrentArrow = null;
    this.demoMoveCurrentArrow = null;
    this.isDemoRunning = false;
    this.wrongStepSound?.play();
  }

  onArrowCleared(arrow: Arrow) {
    if (this.autoPlayCurrentArrow === arrow) {
      this.autoPlayCurrentArrow = null;
    }
    if (this.demoMoveCurrentArrow === arrow) {
      this.demoMoveCurrentArrow = null;
    }
    window.dispatchEvent(
      new CustomEvent(GAME_EVENTS.ARROW_CLEARED, {
        detail: arrow.getHeadGridPos(),
      }),
    );
    const remaining = this.arrows.filter((a) => !a.isCleared);
    window.dispatchEvent(
      new CustomEvent(GAME_EVENTS.ARROWS_PROGRESS, {
        detail: { remaining: remaining.length, total: this.arrows.length },
      }),
    );
    if (remaining.length === 0) {
      this.autoPlayEnabled = false;
      this.isDemoRunning = false;
      this.isActive = false;
      this.successSound?.play();
      window.dispatchEvent(
        new CustomEvent(GAME_EVENTS.WIN, { detail: this.levelIdx }),
      );
    }
  }

  // ── input ──────────────────────────────────────────────────────────────────
  private setupInput() {
    this.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      if (!this.isActive || this.autoPlayEnabled || this.isDemoRunning) return;
      this.panActive = true;
      this.panMoved = false;
      this.panStartX = ptr.x;
      this.panStartY = ptr.y;
      this.panCamScrollX = this.cameras.main.scrollX;
      this.panCamScrollY = this.cameras.main.scrollY;
    });

    this.input.on("pointermove", (ptr: Phaser.Input.Pointer) => {
      if (!this.panActive || !this.isActive) return;
      // Block pan only when the board fits AND the camera is already at the
      // default position. If the user panned while zoomed in and then zoomed
      // back out, scrollX/Y will be non-zero so they can still drag it home.
      const cam = this.cameras.main;
      if (this.isBoardFullyVisible() && cam.scrollX === 0 && cam.scrollY === 0)
        return;
      const dx = ptr.x - this.panStartX;
      const dy = ptr.y - this.panStartY;
      if (!this.panMoved && Math.hypot(dx, dy) < this.PAN_THRESHOLD) return;
      this.panMoved = true;
      const zoom = this.cameras.main.zoom;
      const newScrollX = this.panCamScrollX - dx / zoom;
      const newScrollY = this.panCamScrollY - dy / zoom;
      cam.setScroll(newScrollX, newScrollY);
      const level = this.currentLevelData ?? LEVELS[this.levelIdx];
      if (level) this.clampCameraToBoard(level);
    });

    this.input.on("pointerup", (ptr: Phaser.Input.Pointer) => {
      if (!this.isActive || this.autoPlayEnabled || this.isDemoRunning) return;
      const wasPan = this.panMoved;
      this.panActive = false;
      this.panMoved = false;
      // If the pointer moved enough to count as a drag, skip arrow activation.
      if (wasPan) return;
      for (const arrow of this.arrows) {
        if (
          !arrow.isCleared &&
          !arrow.isMoving &&
          arrow.containsPoint(ptr.worldX, ptr.worldY)
        ) {
          this.whooshSound?.play();
          this.resolveMovingPathConflicts(arrow);
          arrow.startMoving(this.isServerMode);
          // In server mode: emit the head grid position so React can send
          // the click to the API.
          if (this.isServerMode) {
            const headPos = arrow.getHeadGridPos();
            window.dispatchEvent(
              new CustomEvent(GAME_EVENTS.ARROW_CLICKED, { detail: headPos }),
            );
          }
          break;
        }
      }
    });

    // Cancel pan if pointer leaves the canvas
    this.input.on("pointerout", () => {
      this.panActive = false;
      this.panMoved = false;
    });

    this.scale.on("resize", () => {
      // Resize only updates pixel layout. It must not rebuild arrows or replay
      // the intro animation while the player rotates/resizes the screen.
      this.relayoutCurrentLevel();
    });
  }

  // -- React command bridge ---------------------------------------------------
  private handleRetry = () => this.reloadCurrentLevel();
  private handleNext = () => {
    const next = Math.min(this.levelIdx + 1, LEVELS.length - 1);
    this.loadLevel(next);
  };
  private handleGoto = (e: Event) => {
    this.loadLevel((e as CustomEvent).detail);
  };
  private handleGuides = () => {
    this.guidesOn = !this.guidesOn;
    for (const a of this.arrows) {
      if (this.guidesOn) {
        a.showGuide();
      } else {
        a.hideGuide();
      }
    }
  };
  private handleHint = () => {
    if (!this.isActive || this.availableHints <= 0) return;
    this.tapSound?.play();
    const level = this.currentLevelData ?? LEVELS[this.levelIdx];
    const gridW = level.gridSize.x;
    const gridH = level.gridSize.y;

    const safeArrows = this.arrows.filter(
      (a) =>
        !a.isCleared &&
        !a.isMoving &&
        a.isSafeToClear(this.occupancy, gridW, gridH),
    );
    if (safeArrows.length === 0) return;

    this.availableHints--;
    window.dispatchEvent(
      new CustomEvent(GAME_EVENTS.HINTS, { detail: this.availableHints }),
    );

    for (const a of this.arrows) a.clearHint();

    this.hintIndex = (this.hintIndex + 1) % safeArrows.length;
    safeArrows[this.hintIndex].showHint();
  };

  private handleAutoPlay = () => {
    if (!this.isActive || this.isServerMode) return;
    this.autoPlayEnabled = true;
    this.tryAdvanceAutoPlay();
  };

  private handleDemoWrongClick = (e: Event) => {
    if (!this.isActive || this.isServerMode) return;
    this.autoPlayEnabled = true;

    const pos = (e as CustomEvent).detail as GridPos | undefined;
    const level = this.currentLevelData ?? LEVELS[this.levelIdx];
    this.refreshOccupancy();

    const arrow =
      (pos ? this.findArrowByHeadPos(pos) : null) ??
      this.arrows.find(
        (candidate) =>
          !candidate.isCleared &&
          !candidate.isMoving &&
          !candidate.isSafeToClear(
            this.occupancy,
            level.gridSize.x,
            level.gridSize.y,
          ),
      );

    if (!arrow || arrow.isCleared || arrow.isMoving) return;
    if (
      arrow.isSafeToClear(this.occupancy, level.gridSize.x, level.gridSize.y)
    ) {
      return;
    }

    this.autoPlayEnabled = false;
    this.autoPlayCurrentArrow = null;
    this.demoMoveCurrentArrow = arrow;
    this.whooshSound?.play();
    this.resolveMovingPathConflicts(arrow);
    arrow.startMoving(false);
  };

  private handleDemoLock = () => { this.isDemoRunning = true; };
  private handleDemoUnlock = () => { this.isDemoRunning = false; };

  private handleDemoHintClick = (e: Event) => {
    // if (this.isServerMode) return;

    const pos = (e as CustomEvent).detail as GridPos | undefined;
    const level = this.currentLevelData ?? LEVELS[this.levelIdx];
    if (!level) return;
    this.refreshOccupancy();

    const arrow =
      (pos ? this.findArrowByHeadPos(pos) : null) ??
      this.arrows.find(
        (candidate) =>
          !candidate.isCleared &&
          !candidate.isMoving &&
          candidate.isSafeToClear(
            this.occupancy,
            level.gridSize.x,
            level.gridSize.y,
          ),
      );

    if (!arrow || arrow.isCleared || arrow.isMoving) return;
    if (
      !arrow.isSafeToClear(this.occupancy, level.gridSize.x, level.gridSize.y)
    ) {
      return;
    }

    this.autoPlayEnabled = false;
    this.autoPlayCurrentArrow = null;
    this.demoMoveCurrentArrow = arrow;
    this.whooshSound?.play();
    this.resolveMovingPathConflicts(arrow);
    arrow.startMoving(false);
  };

  private tryAdvanceAutoPlay() {
    if (!this.autoPlayEnabled || !this.isActive || this.isServerMode) return;
    if (this.introInProgress) return;
    if (this.arrows.some((arrow) => arrow.isMoving && !arrow.isCleared)) return;

    const level = this.currentLevelData ?? LEVELS[this.levelIdx];
    const gridW = level.gridSize.x;
    const gridH = level.gridSize.y;

    const safeArrow = this.arrows.find(
      (arrow) =>
        !arrow.isCleared &&
        !arrow.isMoving &&
        arrow.isSafeToClear(this.occupancy, gridW, gridH),
    );

    if (!safeArrow) {
      this.autoPlayEnabled = false;
      return;
    }

    this.whooshSound?.play();
    this.resolveMovingPathConflicts(safeArrow);
    this.autoPlayCurrentArrow = safeArrow;
    safeArrow.startMoving(false);
  }

  private handleZoom = (e: Event) => {
    const val = (e as CustomEvent).detail; // 0–100 slider
    const t = Phaser.Math.Clamp(val / 100, 0, 1);
    // Split scale: 0–50 maps [zoomMin → zoomDefault], 50–100 maps [zoomDefault → zoomMax].
    // This keeps the default view always at the centre of the slider.
    const zoom =
      t <= 0.5
        ? this.zoomMin + (t / 0.5) * (this.zoomDefault - this.zoomMin)
        : this.zoomDefault +
        ((t - 0.5) / 0.5) * (this.zoomMax - this.zoomDefault);
    this.cameras.main.setZoom(zoom);
    const level = this.currentLevelData ?? LEVELS[this.levelIdx];
    if (level) this.clampCameraToBoard(level);
    // Echo the slider value back so React stays in sync (no CMD_ZOOM loop —
    // the listener only calls setZoom, it never re-dispatches CMD_ZOOM).
    window.dispatchEvent(
      new CustomEvent(GAME_EVENTS.ZOOM_CHANGED, { detail: val }),
    );
    window.dispatchEvent(
      new CustomEvent("arrowgame:camerazoomchanged", { detail: zoom }),
    );
  };

  // ── server command handlers ────────────────────────────────────────────────
  private handleLoadServer = (e: Event) => {
    const data = (e as CustomEvent).detail as ServerRoundStartData;
    serverRoundBridge.clear();
    this.loadServerLevel(data);
  };

  private handleLoadLevelData = (e: Event) => {
    const level = (e as CustomEvent).detail as LevelData;
    serverRoundBridge.clear();
    this.isServerMode = false;
    this.autoPlayEnabled = false;
    this.loadLevelFromData(level, false);
  };

  private handleServerAck = (e: Event) => {
    const ack = (e as CustomEvent).detail as ServerClickAck;
    const arrow = this.findArrowByHeadPos(ack.clickedPos);
    if (!arrow) return;

    if (ack.success) {
      arrow.confirmServerMove();
      return;
    }

    if (ack.reason === "BLOCKED") {
      arrow.applyServerBlocked();
      console.log("Server Blocked Error");
      return;
    }

    // Server rejected the click for some other reason: force-revert it
    // immediately to keep the client in sync.
    arrow.forceRevert();
  };

  private listenCommands() {
    window.addEventListener(GAME_EVENTS.CMD_RETRY, this.handleRetry);
    window.addEventListener(GAME_EVENTS.CMD_NEXT, this.handleNext);
    window.addEventListener(GAME_EVENTS.CMD_GOTO, this.handleGoto);
    window.addEventListener(GAME_EVENTS.CMD_GUIDES, this.handleGuides);
    window.addEventListener(GAME_EVENTS.CMD_HINT, this.handleHint);
    window.addEventListener(
      GAME_EVENTS.CMD_DEMO_HINT_CLICK,
      this.handleDemoHintClick,
    );
    window.addEventListener(
      GAME_EVENTS.CMD_DEMO_WRONG_CLICK,
      this.handleDemoWrongClick,
    );
    window.addEventListener(GAME_EVENTS.CMD_DEMO_LOCK, this.handleDemoLock);
    window.addEventListener(GAME_EVENTS.CMD_DEMO_UNLOCK, this.handleDemoUnlock);
    window.addEventListener(GAME_EVENTS.CMD_AUTOPLAY, this.handleAutoPlay);
    window.addEventListener(GAME_EVENTS.CMD_ZOOM, this.handleZoom);
    window.addEventListener(
      GAME_EVENTS.CMD_LOAD_LEVEL_DATA,
      this.handleLoadLevelData,
    );
    window.addEventListener(GAME_EVENTS.CMD_LOAD_SERVER, this.handleLoadServer);
    window.addEventListener(GAME_EVENTS.SERVER_ACK, this.handleServerAck);
    window.addEventListener(
      GAME_EVENTS.CMD_SET_MUSIC_VOL,
      this.handleSetMusicVol,
    );
    window.addEventListener(GAME_EVENTS.CMD_SET_SFX_VOL, this.handleSetSfxVol);

    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      window.removeEventListener(GAME_EVENTS.CMD_RETRY, this.handleRetry);
      window.removeEventListener(GAME_EVENTS.CMD_NEXT, this.handleNext);
      window.removeEventListener(GAME_EVENTS.CMD_GOTO, this.handleGoto);
      window.removeEventListener(GAME_EVENTS.CMD_GUIDES, this.handleGuides);
      window.removeEventListener(GAME_EVENTS.CMD_HINT, this.handleHint);
      window.removeEventListener(
        GAME_EVENTS.CMD_DEMO_HINT_CLICK,
        this.handleDemoHintClick,
      );
      window.removeEventListener(
        GAME_EVENTS.CMD_DEMO_WRONG_CLICK,
        this.handleDemoWrongClick,
      );
      window.removeEventListener(GAME_EVENTS.CMD_DEMO_LOCK, this.handleDemoLock);
      window.removeEventListener(GAME_EVENTS.CMD_DEMO_UNLOCK, this.handleDemoUnlock);
      window.removeEventListener(GAME_EVENTS.CMD_AUTOPLAY, this.handleAutoPlay);
      window.removeEventListener(GAME_EVENTS.CMD_ZOOM, this.handleZoom);
      window.removeEventListener(
        GAME_EVENTS.CMD_LOAD_LEVEL_DATA,
        this.handleLoadLevelData,
      );
      window.removeEventListener(
        GAME_EVENTS.CMD_LOAD_SERVER,
        this.handleLoadServer,
      );
      window.removeEventListener(GAME_EVENTS.SERVER_ACK, this.handleServerAck);
      window.removeEventListener(
        GAME_EVENTS.CMD_SET_MUSIC_VOL,
        this.handleSetMusicVol,
      );
      window.removeEventListener(
        GAME_EVENTS.CMD_SET_SFX_VOL,
        this.handleSetSfxVol,
      );
    });
  }
  // Returns true when the full board fits inside the viewport at the current
  // zoom — panning is pointless (and confusing) in that case.
  private isBoardFullyVisible(): boolean {
    const level = this.currentLevelData ?? LEVELS[this.levelIdx];
    if (!level) return true;
    const boardW = level.gridSize.x * this.cellPx;
    const boardH = level.gridSize.y * this.cellPx;
    const zoom = this.cameras.main.zoom;
    return (
      boardW * zoom <= this.scale.width && boardH * zoom <= this.scale.height
    );
  }

  // ── drawing helpers ────────────────────────────────────────────────────────
  private gridGfx?: Phaser.GameObjects.Graphics;

  private drawGrid(_cols: number, _rows: number) {
    this.gridGfx?.clear();
    // if (!this.gridGfx) {
    //   this.gridGfx = this.add.graphics();
    //   this.gridGfx.setDepth(-5);
    // }

    // const boardW = cols * this.cellPx;
    // const boardH = rows * this.cellPx;

    // this.gridGfx.lineStyle(1, THEME.goldFaint, 0.58);
    // for (let c = 0; c <= cols; c++) {
    //   const x = this.offX + c * this.cellPx;
    //   this.gridGfx.beginPath();
    //   this.gridGfx.moveTo(x, this.offY);
    //   this.gridGfx.lineTo(x, this.offY + boardH);
    //   this.gridGfx.strokePath();
    // }
    // for (let r = 0; r <= rows; r++) {
    //   const y = this.offY + r * this.cellPx;
    //   this.gridGfx.beginPath();
    //   this.gridGfx.moveTo(this.offX, y);
    //   this.gridGfx.lineTo(this.offX + boardW, y);
    //   this.gridGfx.strokePath();
    // }
  }

  // HUD is now handled by the React UI layer
  private updateHUD() {
    /* no-op — React handles HUD */
  }

  onCollisionGlow() {
    window.dispatchEvent(new CustomEvent(GAME_EVENTS.COLLISION_GLOW));
  }
}
