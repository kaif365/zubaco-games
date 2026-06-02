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
  travelPx: number;
  cellPx: number;
  onClick: () => void;
  onExitEnd: () => void;
}

// All arrows look the same — player figures out which ones move
const STATE_COLORS: Record<ArrowVisualState, { stroke: string; glow: string; bg: string }> = {
  movable: { stroke: "#94a3b8", glow: "transparent", bg: "transparent" },
  blocked: { stroke: "#94a3b8", glow: "transparent", bg: "transparent" },
  hint: { stroke: "#fbbf24", glow: "rgba(251, 191, 36, 0.5)", bg: "rgba(251, 191, 36, 0.1)" },
  exiting: { stroke: "#34d399", glow: "rgba(52, 211, 153, 0.4)", bg: "rgba(52, 211, 153, 0.08)" },
  shaking: { stroke: "#f43f5e", glow: "rgba(244, 63, 94, 0.5)", bg: "rgba(244, 63, 94, 0.1)" },
};

function getArrowPath(direction: Direction): string {
  switch (direction) {
    case "right": return "M 14 30 L 40 30";
    case "left":  return "M 46 30 L 20 30";
    case "up":    return "M 30 46 L 30 20";
    case "down":  return "M 30 14 L 30 40";
  }
}

function getHeadPath(direction: Direction): string {
  switch (direction) {
    case "right": return "M 37 22 L 50 30 L 37 38";
    case "left":  return "M 23 22 L 10 30 L 23 38";
    case "up":    return "M 22 23 L 30 10 L 38 23";
    case "down":  return "M 22 37 L 30 50 L 38 37";
  }
}

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
  const colors = STATE_COLORS[visualState];

  // Step-by-step exit animation
  useEffect(() => {
    if (visualState !== "exiting" || !ref.current) return;

    const el = ref.current;
    const isHorizontal = piece.direction === "right" || piece.direction === "left";
    const sign = piece.direction === "right" || piece.direction === "down" ? 1 : -1;
    const axis = isHorizontal ? "x" : "y";
    const steps = Math.round(travelPx / cellPx);

    gsap.killTweensOf(el);
    const tl = gsap.timeline({ onComplete: onExitEnd });
    tlRef.current = tl;

    for (let i = 1; i <= steps; i++) {
      tl.to(el, { [axis]: sign * i * cellPx, duration: 0.07, ease: "power1.inOut" });
    }

    tl.to(el, {
      [axis]: sign * (travelPx + cellPx * 0.6),
      opacity: 0,
      scale: 1.15,
      duration: 0.12,
      ease: "power2.in",
    });

    return () => { tl.kill(); };
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
        x: 4, rotation: 3, duration: 0.06,
        yoyo: true, repeat: 5, ease: "power1.inOut",
        onComplete: () => gsap.set(ref.current!, { x: 0, rotation: 0 }),
      },
    );
  }, [visualState]);

  const isSpecial = visualState === "hint" || visualState === "shaking" || visualState === "exiting";

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={visualState === "exiting"}
      className="w-full h-full cursor-pointer focus:outline-none transition-transform duration-150 hover:scale-105 active:scale-95"
      style={{ transformOrigin: "center center" }}
      aria-label={`${piece.direction} arrow`}
    >
      <div
        className="w-full h-full rounded-xl flex items-center justify-center transition-all duration-200"
        style={{
          backgroundColor: colors.bg,
          boxShadow: isSpecial ? `0 0 8px ${colors.glow}` : "none",
        }}
      >
        <svg viewBox="0 0 60 60" className="w-[65%] h-[65%] overflow-visible">
          <defs>
            <filter id={`glow-${piece.id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={getArrowPath(piece.direction)}
            stroke={colors.stroke}
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
            filter={isSpecial ? `url(#glow-${piece.id})` : undefined}
          />
          <path
            d={getHeadPath(piece.direction)}
            stroke={colors.stroke}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter={isSpecial ? `url(#glow-${piece.id})` : undefined}
          />
        </svg>
      </div>
    </button>
  );
}
