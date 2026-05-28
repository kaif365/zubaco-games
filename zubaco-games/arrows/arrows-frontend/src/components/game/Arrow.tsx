"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowPiece, Direction } from "@/lib/game/types";

export type ArrowVisualState =
  | "movable"
  | "blocked"
  | "hint"
  | "exiting"
  | "shaking";

interface ArrowProps {
  piece: ArrowPiece;
  visualState: ArrowVisualState;
  /** Pixel distance from this cell to the board edge in the arrow's direction */
  travelPx: number;
  /** Size of one cell in pixels (step unit) */
  cellPx: number;
  onClick: () => void;
  onExitEnd: () => void;
}

function getLPath(direction: Direction, variant: number): string {
  switch (direction) {
    case "right":
      return variant === 0
        ? "M 30 0 L 30 30 L 48 30"
        : "M 30 60 L 30 30 L 48 30";
    case "left":
      return variant === 0
        ? "M 30 0 L 30 30 L 12 30"
        : "M 30 60 L 30 30 L 12 30";
    case "up":
      return variant === 0
        ? "M 60 30 L 30 30 L 30 12"
        : "M 0 30 L 30 30 L 30 12";
    case "down":
      return variant === 0
        ? "M 60 30 L 30 30 L 30 48"
        : "M 0 30 L 30 30 L 30 48";
  }
}

function Arrowhead({
  direction,
  color,
}: {
  direction: Direction;
  color: string;
}) {
  switch (direction) {
    case "right":
      return <polygon points="48,23 60,30 48,37" fill={color} />;
    case "left":
      return <polygon points="12,23 0,30 12,37" fill={color} />;
    case "up":
      return <polygon points="23,12 30,0 37,12" fill={color} />;
    case "down":
      return <polygon points="23,48 30,60 37,48" fill={color} />;
  }
}

const STROKE: Record<ArrowVisualState, string> = {
  movable: "#1e293b",
  blocked: "#cbd5e1",
  hint: "#ef4444",
  exiting: "#1e293b",
  shaking: "#f97316",
};

export function Arrow({
  piece,
  visualState,
  travelPx,
  cellPx,
  onClick,
  onExitEnd,
}: ArrowProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const variant = (piece.row + piece.col) % 2;
  const color = STROKE[visualState];

  // Snake-like step-by-step exit: arrow hops one cell at a time, then shoots off the edge
  useEffect(() => {
    if (visualState !== "exiting" || !ref.current) return;

    const el = ref.current;
    const isHorizontal =
      piece.direction === "right" || piece.direction === "left";
    const sign =
      piece.direction === "right" || piece.direction === "down" ? 1 : -1;
    const axis = isHorizontal ? "x" : "y";

    // Number of whole cells to traverse before the edge
    const steps = Math.round(travelPx / cellPx);

    // Kill any previous animation on this element
    gsap.killTweensOf(el);
    const tl = gsap.timeline({ onComplete: onExitEnd });
    tlRef.current = tl;

    // Step through each cell — snake movement
    for (let i = 1; i <= steps; i++) {
      tl.to(el, {
        [axis]: sign * i * cellPx,
        duration: 0.09,
        ease: "power1.inOut",
      });
    }

    // Final burst off the board + fade
    tl.to(el, {
      [axis]: sign * (travelPx + cellPx * 0.6),
      opacity: 0,
      duration: 0.1,
      ease: "power2.in",
    });

    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualState]);

  // Shake on wrong move
  useEffect(() => {
    if (visualState !== "shaking" || !ref.current) return;
    gsap.killTweensOf(ref.current);
    gsap.fromTo(
      ref.current,
      { x: 0, rotation: 0 },
      {
        x: 5,
        rotation: 4,
        duration: 0.07,
        yoyo: true,
        repeat: 5,
        ease: "power1.inOut",
        onComplete: () => gsap.set(ref.current!, { x: 0, rotation: 0 }),
      },
    );
  }, [visualState]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={visualState === "exiting"}
      className="w-full h-full cursor-pointer focus:outline-none"
      style={{ transformOrigin: "center center" }}
      aria-label={`${piece.direction} arrow`}
    >
      <svg
        viewBox="0 0 60 60"
        className="w-full h-full overflow-visible"
        style={{
          filter:
            visualState === "hint" ? "drop-shadow(0 0 5px #ef4444)" : undefined,
        }}
      >
        <path
          d={getLPath(piece.direction, variant)}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Arrowhead direction={piece.direction} color={color} />
      </svg>
    </button>
  );
}
