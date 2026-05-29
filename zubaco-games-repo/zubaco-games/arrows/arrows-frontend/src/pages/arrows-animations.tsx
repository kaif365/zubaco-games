import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { GAME_EVENTS, type ServerBoard } from "@/game/gameTypes";

const MAX_DEMO_HINT_MOVES = 3;

type GameDirection = "up" | "down" | "left" | "right";

interface HintMove {
  gridX: number;
  gridY: number;
  direction: GameDirection;
  color: number;
}

function intToHex(c: number) {
  return `#${(c & 0xffffff).toString(16).padStart(6, "0")}`;
}

function directionDelta(d: GameDirection) {
  return d === "up"
    ? { dx: 0, dy: 1 }
    : d === "down"
      ? { dx: 0, dy: -1 }
      : d === "left"
        ? { dx: -1, dy: 0 }
        : { dx: 1, dy: 0 };
}

function buildOccupiedMap(board: ServerBoard) {
  const occupied = new Map<string, number>();
  board.arrows.forEach((arrow, index) => {
    if (arrow.isRemoved) return;
    for (const waypoint of arrow.waypoints) {
      occupied.set(`${waypoint.x},${waypoint.y}`, index);
    }
  });
  return occupied;
}

function isArrowSafe(
  board: ServerBoard,
  occupied: Map<string, number>,
  index: number,
) {
  const arrow = board.arrows[index];
  if (!arrow || arrow.isRemoved) return false;

  const { x: gridWidth, y: gridHeight } = board.gridSize;
  const head = arrow.waypoints[arrow.waypoints.length - 1];
  const { dx, dy } = directionDelta(arrow.headDirection);
  let cx = head.x + dx;
  let cy = head.y + dy;

  while (cx >= 0 && cx < gridWidth && cy >= 0 && cy < gridHeight) {
    const key = `${cx},${cy}`;
    if (occupied.has(key) && occupied.get(key) !== index) return false;
    cx += dx;
    cy += dy;
  }

  return true;
}

function computeHintMoves(board: ServerBoard | null): HintMove[] {
  if (!board?.arrows?.length) return [];

  const occupied = buildOccupiedMap(board);
  const hints: HintMove[] = [];
  const used = new Set<number>();

  for (let i = 0; i < board.arrows.length && hints.length < MAX_DEMO_HINT_MOVES; i++) {
    const arrow = board.arrows[i];
    if (!arrow || arrow.isRemoved || !isArrowSafe(board, occupied, i)) continue;

    const head = arrow.waypoints[arrow.waypoints.length - 1];
    hints.push({
      gridX: head.x,
      gridY: head.y,
      direction: arrow.headDirection,
      color: arrow.color,
    });
    used.add(i);

    for (const waypoint of arrow.waypoints) {
      occupied.delete(`${waypoint.x},${waypoint.y}`);
    }
  }

  for (let i = 0; i < board.arrows.length && hints.length < MAX_DEMO_HINT_MOVES; i++) {
    if (used.has(i)) continue;
    const arrow = board.arrows[i];
    if (!arrow || arrow.isRemoved) continue;

    const head = arrow.waypoints[arrow.waypoints.length - 1];
    hints.push({
      gridX: head.x,
      gridY: head.y,
      direction: arrow.headDirection,
      color: arrow.color,
    });
  }

  return hints;
}

function computeWrongHintMove(board: ServerBoard | null): HintMove | null {
  if (!board?.arrows?.length) return null;

  const occupied = buildOccupiedMap(board);
  for (let i = 0; i < board.arrows.length; i++) {
    const arrow = board.arrows[i];
    if (!arrow || arrow.isRemoved || isArrowSafe(board, occupied, i)) continue;

    const head = arrow.waypoints[arrow.waypoints.length - 1];
    return {
      gridX: head.x,
      gridY: head.y,
      direction: arrow.headDirection,
      color: arrow.color,
    };
  }

  return null;
}

function gridToScreen(
  container: HTMLElement,
  gridX: number,
  gridY: number,
  gridWidth: number,
  gridHeight: number,
  cameraZoom: number,
): { x: number; y: number; cell: number } {
  const rect = container.getBoundingClientRect();
  const containerWidth = rect.width;
  const containerHeight = rect.height;
  const pad = Math.max(8, Math.min(28, containerWidth * 0.04));
  const availableWidth = Math.max(1, containerWidth - pad * 2);
  const availableHeight = Math.max(1, containerHeight - pad * 2);
  const baseCellPx = Math.min(availableWidth / 4, availableHeight / 4) * 0.58;
  const fitCellPx = Math.min(
    availableWidth / Math.max(gridWidth * 0.75, 1),
    availableHeight / Math.max(gridHeight * 0.75, 1),
  );
  const cellPx = Math.max(1, Math.floor(Math.min(baseCellPx, fitCellPx)));
  const boardWidth = cellPx * gridWidth;
  const boardHeight = cellPx * gridHeight;
  const offsetX = containerWidth / 2 - boardWidth / 2;
  const offsetY = containerHeight / 2 - boardHeight / 2;
  const worldX = offsetX + gridX * cellPx + cellPx / 2;
  const worldY = offsetY + (gridHeight - 1 - gridY) * cellPx + cellPx / 2;
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  return {
    x: centerX + (worldX - centerX) * cameraZoom,
    y: centerY + (worldY - centerY) * cameraZoom,
    cell: cellPx * cameraZoom,
  };
}

function dragOffset(dir: GameDirection, cell: number) {
  const distance = Math.min(cell * 1.8, 72);
  return dir === "up"
    ? { dx: 0, dy: -distance }
    : dir === "down"
      ? { dx: 0, dy: distance }
      : dir === "left"
        ? { dx: -distance, dy: 0 }
        : { dx: distance, dy: 0 };
}

function directionRotation(dir: GameDirection) {
  return dir === "right" ? 0 : dir === "down" ? 90 : dir === "left" ? 180 : -90;
}

const T_APPEAR = 520;
const T_TAP = 260;
const T_DRAG = 760;
const T_LIFT = 360;
const T_PAUSE = 600;
/** Slow glide when the hand relocates to the next hint target. */
const T_TRAVEL = 1650;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface DemoHintOverlayProps {
  board: ServerBoard | null;
  phase: string;
  status: string;
  cameraZoom: number;
  movesShown: number;
  isBoardReady: boolean;
  hintsEnabled: boolean;
}

export function DemoHintOverlay({
  board,
  phase,
  status,
  cameraZoom,
  movesShown,
  isBoardReady,
  hintsEnabled,
}: DemoHintOverlayProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongDemoTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wrongDemoRunRef = useRef(false);
  const demoHintClickKeyRef = useRef<string | null>(null);
  const cyclesRef = useRef(0);
  const [anim, setAnim] = useState<
    "appear" | "tap" | "drag" | "lift" | "pause" | "travel"
  >("appear");
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [renderPos, setRenderPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const renderPosRef = useRef<{ x: number; y: number } | null>(null);
  const travelFrameRef = useRef<number | null>(null);
  const prevMoveKeyRef = useRef<string | null>(null);
  const [drag, setDrag] = useState({ dx: 0, dy: 0 });
  const [cell, setCell] = useState(60);
  const [visible, setVisible] = useState(false);
  const [wrongDemoDone, setWrongDemoDone] = useState(false);
  const [wrongCrossVisible, setWrongCrossVisible] = useState(false);
  const [cleared, setCleared] = useState(0);

  const wrongMove = useMemo(() => computeWrongHintMove(board), [board]);
  const shouldShowWrongDemo =
    hintsEnabled &&
    phase === "tutorial" &&
    status === "playing" &&
    isBoardReady &&
    movesShown === 0 &&
    cleared === 0 &&
    !wrongDemoDone &&
    !!wrongMove;

  const isActive =
    hintsEnabled &&
    phase === "tutorial" &&
    status === "playing" &&
    isBoardReady &&
    (wrongDemoDone || !wrongMove || movesShown > 0) &&
    movesShown < MAX_DEMO_HINT_MOVES &&
    cleared < MAX_DEMO_HINT_MOVES;

  const hints = useMemo(() => computeHintMoves(board), [board]);
  const move = shouldShowWrongDemo ? wrongMove : (hints[cleared] ?? null);

  const clearWrongDemoTimers = useCallback(() => {
    wrongDemoTimersRef.current.forEach(clearTimeout);
    wrongDemoTimersRef.current = [];
  }, []);

  const cancelTravel = useCallback(() => {
    if (travelFrameRef.current !== null) {
      cancelAnimationFrame(travelFrameRef.current);
      travelFrameRef.current = null;
    }
  }, []);

  const startTravelTo = useCallback(
    (target: { x: number; y: number }) => {
      cancelTravel();
      const from = renderPosRef.current ?? target;
      const dx = target.x - from.x;
      const dy = target.y - from.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 4) {
        renderPosRef.current = target;
        setRenderPos(target);
        setAnim("appear");
        return;
      }
      const arcLift = Math.min(56, Math.max(18, distance * 0.14));
      const start = performance.now();

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / T_TRAVEL);
        const e = easeInOutCubic(t);
        const arc = Math.sin(Math.PI * t) * arcLift;
        const next = {
          x: from.x + dx * e,
          y: from.y + dy * e - arc,
        };
        renderPosRef.current = next;
        setRenderPos(next);

        if (t < 1) {
          travelFrameRef.current = requestAnimationFrame(tick);
          return;
        }

        travelFrameRef.current = null;
        renderPosRef.current = target;
        setRenderPos(target);
        setAnim("appear");
      };

      travelFrameRef.current = requestAnimationFrame(tick);
    },
    [cancelTravel],
  );

  useEffect(() => {
    clearWrongDemoTimers();
    wrongDemoRunRef.current = false;
    setCleared(0);
    setWrongDemoDone(false);
    setWrongCrossVisible(false);
    demoHintClickKeyRef.current = null;
    cyclesRef.current = 0;
    prevMoveKeyRef.current = null;
    cancelTravel();
    setRenderPos(null);
    renderPosRef.current = null;
    setAnim("appear");
  }, [board, cancelTravel, clearWrongDemoTimers]);

  useEffect(() => {
    if (phase === "tutorial" && status === "playing") {
      clearWrongDemoTimers();
      wrongDemoRunRef.current = false;
      setCleared(0);
      setWrongDemoDone(false);
      setWrongCrossVisible(false);
      demoHintClickKeyRef.current = null;
      cyclesRef.current = 0;
      prevMoveKeyRef.current = null;
      cancelTravel();
      setRenderPos(null);
      renderPosRef.current = null;
      setAnim("appear");
    }
  }, [phase, cancelTravel, status, clearWrongDemoTimers]);

  useEffect(() => {
    const handler = () => {
      demoHintClickKeyRef.current = null;
      setCleared((prev) => {
        const next = prev + 1;
        if (movesShown + next < MAX_DEMO_HINT_MOVES) setAnim("travel");
        return next;
      });
    };
    window.addEventListener(GAME_EVENTS.ARROW_CLEARED, handler);
    return () => window.removeEventListener(GAME_EVENTS.ARROW_CLEARED, handler);
  }, [movesShown]);

  useEffect(() => {
    const event = isActive || shouldShowWrongDemo
      ? GAME_EVENTS.CMD_DEMO_LOCK
      : GAME_EVENTS.CMD_DEMO_UNLOCK;
    window.dispatchEvent(new CustomEvent(event));
  }, [isActive, shouldShowWrongDemo]);

  useEffect(() => {
    containerRef.current = document.querySelector(
      ".arrow-playfield",
    ) as HTMLElement | null;
  });

  const updatePos = useCallback(() => {
    if (!containerRef.current || !board || !move) return;
    const screenPosition = gridToScreen(
      containerRef.current,
      move.gridX,
      move.gridY,
      board.gridSize.x,
      board.gridSize.y,
      cameraZoom,
    );
    setCell(screenPosition.cell);
    setPos({ x: screenPosition.x, y: screenPosition.y });
    setDrag(dragOffset(move.direction, screenPosition.cell));
  }, [board, move, cameraZoom]);

  useEffect(() => {
    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [updatePos]);

  useEffect(() => {
    renderPosRef.current = renderPos;
  }, [renderPos]);

  useEffect(() => {
    if (!pos || anim === "travel") return;
    setRenderPos(pos);
    renderPosRef.current = pos;
  }, [anim, pos]);

  useEffect(() => {
    if (!pos || !move || shouldShowWrongDemo) return;

    const moveKey = `${move.gridX},${move.gridY}`;
    const prevKey = prevMoveKeyRef.current;
    prevMoveKeyRef.current = moveKey;

    if (
      prevKey &&
      prevKey !== moveKey &&
      (visible || wrongDemoDone) &&
      (wrongDemoDone || !wrongMove) &&
      anim !== "travel"
    ) {
      setAnim("travel");
    }
  }, [anim, move, pos, shouldShowWrongDemo, visible, wrongDemoDone, wrongMove]);

  useEffect(() => {
    if (anim !== "travel" || !containerRef.current || !board || !move) return;

    const screenPosition = gridToScreen(
      containerRef.current,
      move.gridX,
      move.gridY,
      board.gridSize.x,
      board.gridSize.y,
      cameraZoom,
    );
    const target = { x: screenPosition.x, y: screenPosition.y };
    setCell(screenPosition.cell);
    setPos(target);
    setDrag(dragOffset(move.direction, screenPosition.cell));
    setVisible(true);
    startTravelTo(target);

    return () => {
      cancelTravel();
    };
  }, [anim, board, cameraZoom, cancelTravel, move, startTravelTo]);

  useEffect(() => {
    if (!shouldShowWrongDemo || !move) {
      clearWrongDemoTimers();
      wrongDemoRunRef.current = false;
      return;
    }

    if (wrongDemoRunRef.current) return;
    wrongDemoRunRef.current = true;
    clearWrongDemoTimers();
    updatePos();
    setVisible(true);
    setWrongCrossVisible(false);
    setAnim("appear");

    wrongDemoTimersRef.current = [
      setTimeout(() => setAnim("tap"), 520),
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent(GAME_EVENTS.CMD_DEMO_WRONG_CLICK, {
            detail: { x: move.gridX, y: move.gridY },
          }),
        );
        setAnim("drag");
      }, 860),
      setTimeout(() => {
        setWrongCrossVisible(true);
        setAnim("lift");
      }, 1950),
      setTimeout(() => {
        setVisible(false);
        setAnim("appear");
        setWrongDemoDone(true);
        wrongDemoRunRef.current = false;
      }, 4200),
    ];

    return () => {
      clearWrongDemoTimers();
      wrongDemoRunRef.current = false;
    };
  }, [clearWrongDemoTimers, move, shouldShowWrongDemo, updatePos]);

  useEffect(() => {
    if (!move) {
      setVisible(false);
      return;
    }
    if (shouldShowWrongDemo) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!isActive) {
      setVisible(false);
      return;
    }

    if (anim === "travel") return;

    switch (anim) {
      case "appear":
        updatePos();
        setVisible(true);
        timerRef.current = setTimeout(() => setAnim("tap"), T_APPEAR);
        break;
      case "tap":
        timerRef.current = setTimeout(() => {
          const clickKey = `${move.gridX},${move.gridY},${cleared},${movesShown}`;
          if (demoHintClickKeyRef.current !== clickKey) {
            demoHintClickKeyRef.current = clickKey;
            window.dispatchEvent(
              new CustomEvent(GAME_EVENTS.CMD_DEMO_HINT_CLICK, {
                detail: { x: move.gridX, y: move.gridY },
              }),
            );
          }
          setAnim("drag");
        }, T_TAP);
        break;
      case "drag":
        timerRef.current = setTimeout(() => setAnim("lift"), T_DRAG);
        break;
      case "lift":
        timerRef.current = setTimeout(() => setAnim("pause"), T_LIFT);
        break;
      case "pause":
        timerRef.current = setTimeout(() => {
          cyclesRef.current += 1;
          if (cyclesRef.current >= 7) {
            setVisible(false);
            return;
          }
          setAnim("appear");
        }, T_PAUSE);
        break;
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    anim,
    cleared,
    isActive,
    move,
    movesShown,
    shouldShowWrongDemo,
    updatePos,
  ]);

  if ((!isActive && !shouldShowWrongDemo) || !visible || !pos || !move)
    return null;

  const visualPos = renderPos ?? pos;
  const isTraveling = anim === "travel";
  const isTapping = anim === "tap";
  const isDragging = !shouldShowWrongDemo && anim === "drag";
  const isLifting =
    !shouldShowWrongDemo && (anim === "lift" || anim === "pause");
  const isPaused = anim === "pause";
  const htx = isTraveling ? 0 : isDragging ? drag.dx : isLifting ? drag.dx * 0.25 : 0;
  const hty = isTraveling
    ? -6
    : isDragging
      ? drag.dy
      : isLifting
        ? drag.dy * 0.25 - 8
        : 0;
  const handScale = isTraveling
    ? 0.94
    : isTapping
      ? 0.78
      : shouldShowWrongDemo && wrongCrossVisible
        ? 0.92
        : 1;
  const color = intToHex(move.color);
  const glowPx = Math.round(cell * 1.45);
  const crossPx = Math.round(Math.max(34, Math.min(58, cell * 0.82)));
  const wrongCrossX = visualPos.x;
  const wrongCrossY = visualPos.y;
  const rotDeg = directionRotation(move.direction);
  const step = movesShown + 1;
  const fadeDur = isDragging ? T_DRAG : T_LIFT;
  const isMobileViewport =
    typeof window !== "undefined" && window.innerWidth <= 640;
  const handWidth = isMobileViewport
    ? Math.round(Math.max(30, Math.min(44, cell * 0.58)))
    : 44;
  const handHeight = Math.round(handWidth * (78 / 44));

  return (
    <>
      <div
        style={
          {
            position: "absolute",
            left: visualPos.x - glowPx / 2,
            top: visualPos.y - glowPx / 2,
            width: glowPx,
            height: glowPx,
            borderRadius: "50%",
            pointerEvents: "none",
            zIndex: 9000,
            boxShadow: `0 0 0 3px ${color}, 0 0 22px 7px ${color}88`,
            animation: isTraveling
              ? "dhint-travel-glow 1.55s ease-in-out infinite"
              : "dhint-pulse 1s ease-in-out infinite",
            opacity: isPaused ? 0 : isTraveling ? 0.72 : 1,
            transition: "opacity 0.45s ease",
          } as CSSProperties
        }
      />

      {shouldShowWrongDemo && isTapping && (
        <div
          style={
            {
              position: "absolute",
              left: pos.x,
              top: pos.y,
              width: glowPx * 0.72,
              height: glowPx * 0.72,
              pointerEvents: "none",
              zIndex: 9001,
              borderRadius: "50%",
              border: `3px solid ${color}`,
              transform: "translate(-50%, -50%) scale(0.64)",
              opacity: 0.9,
              animation: "dhint-click-ring 0.34s ease-out both",
              boxShadow: `0 0 18px ${color}88`,
            } as CSSProperties
          }
        />
      )}

      {shouldShowWrongDemo && wrongCrossVisible && (
        <div
          style={
            {
              position: "absolute",
              left: wrongCrossX - crossPx / 2,
              top: wrongCrossY - crossPx / 2,
              width: crossPx,
              height: crossPx,
              pointerEvents: "none",
              zIndex: 9003,
              animation: "dhint-cross-pop 0.22s ease-out both",
              filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.55))",
            } as CSSProperties
          }
        >
          <svg
            viewBox="0 0 64 64"
            width="100%"
            height="100%"
            aria-hidden="true"
          >
            <path
              d="M14 14L50 50M50 14L14 50"
              stroke="#ff3838"
              strokeWidth="12"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {!shouldShowWrongDemo && (
        <div
          style={
            {
              position: "absolute",
              left: visualPos.x,
              top: visualPos.y - glowPx / 2 - 34,
              transform: "translateX(-50%)",
              pointerEvents: "none",
              zIndex: 9001,
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "rgba(0,0,0,0.75)",
              border: `1.5px solid ${color}`,
              borderRadius: 999,
              padding: "3px 10px 3px 5px",
              opacity: isPaused || isTraveling ? 0 : 1,
              transition: "opacity 0.45s ease, left 0ms, top 0ms",
            } as CSSProperties
          }
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 17,
              height: 17,
              borderRadius: "50%",
              background: color,
              color: "#fff",
              fontSize: 10,
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {step}
          </span>
          <span
            style={{
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
            }}
          >
            {step === 1 ? "First move" : "Next move"}
          </span>
          <svg
            width={11}
            height={11}
            viewBox="0 0 12 12"
            style={{
              transform: `rotate(${rotDeg}deg)`,
              fill: color,
              flexShrink: 0,
            }}
          >
            <path d="M7.5 2L11 6L7.5 10V7H1V5H7.5V2Z" />
          </svg>
        </div>
      )}

      {(isDragging || isLifting) && (
        <div
          style={
            {
              position: "absolute",
              left: visualPos.x,
              top: visualPos.y,
              pointerEvents: "none",
              zIndex: 8999,
              width: Math.abs(drag.dx) + Math.abs(drag.dy),
              height: 3,
              transformOrigin: "0 50%",
              transform: `rotate(${rotDeg}deg)`,
              background: `linear-gradient(90deg, ${color}cc, transparent)`,
              borderRadius: 999,
              opacity: isDragging ? 0.75 : 0,
              transition: "opacity 0.3s ease",
            } as CSSProperties
          }
        />
      )}

      {isTraveling && (
        <div
          style={
            {
              position: "absolute",
              left: visualPos.x,
              top: visualPos.y,
              width: 14,
              height: 14,
              marginLeft: -7,
              marginTop: -7,
              borderRadius: "50%",
              pointerEvents: "none",
              zIndex: 8998,
              background: color,
              boxShadow: `0 0 16px 4px ${color}aa`,
              animation: "dhint-travel-spark 1.55s ease-in-out infinite",
            } as CSSProperties
          }
        />
      )}

      <div
        style={
          {
            position: "absolute",
            left: visualPos.x + htx - handWidth / 2,
            top: visualPos.y + hty - 10,
            pointerEvents: "none",
            zIndex: 9002,
            transform: `scale(${handScale})`,
            transformOrigin: `${handWidth / 2}px 10px`,
            opacity: isPaused ? 0 : isTraveling ? 0.96 : 1,
            transition: isTraveling
              ? "transform 180ms ease, opacity 180ms ease"
              : [
                  `left ${fadeDur}ms cubic-bezier(0.4,0,0.2,1)`,
                  `top ${fadeDur}ms cubic-bezier(0.4,0,0.2,1)`,
                  "transform 110ms ease",
                  `opacity ${isPaused ? 200 : anim === "appear" ? 280 : 130}ms ease`,
                ].join(", "),
          } as CSSProperties
        }
      >
        <img
          src="/assets/hand-icon.svg"
          alt=""
          width={handWidth}
          height={handHeight}
          draggable={false}
          style={{
            display: "block",
            filter: [
              "drop-shadow(0 2px 10px rgba(0,0,0,0.65))",
              isTraveling ? `drop-shadow(0 0 14px ${color}99)` : "",
              isTapping ? "brightness(0.82)" : "brightness(1)",
            ]
              .filter(Boolean)
              .join(" "),
            animation: isTraveling
              ? "dhint-travel-bob 1.55s ease-in-out infinite"
              : undefined,
            transition: "filter 180ms ease",
          }}
        />
      </div>

      <style>{`
        @keyframes dhint-pulse {
          0%,100%{transform:scale(1);opacity:.8}
          50%{transform:scale(1.16);opacity:1}
        }
        @keyframes dhint-travel-glow {
          0%,100%{transform:scale(1);opacity:.72}
          50%{transform:scale(1.1);opacity:.95}
        }
        @keyframes dhint-travel-bob {
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-6px)}
        }
        @keyframes dhint-travel-spark {
          0%,100%{transform:scale(.85);opacity:.55}
          50%{transform:scale(1.15);opacity:1}
        }
        @keyframes dhint-cross-pop {
          0%{transform:scale(.35);opacity:0}
          100%{transform:scale(1);opacity:1}
        }
        @keyframes dhint-click-ring {
          0%{transform:translate(-50%,-50%) scale(.42);opacity:.95}
          100%{transform:translate(-50%,-50%) scale(1.08);opacity:0}
        }
      `}</style>
    </>
  );
}
