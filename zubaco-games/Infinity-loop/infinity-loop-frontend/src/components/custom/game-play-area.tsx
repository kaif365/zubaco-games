"use client";

import { GameGridFrameSkeleton } from "@/components/custom/game-grid-frame-skeleton";
import { GameHintBanner } from "@/components/custom/game-hint-banner";
import { PlayAreaSessionBadge } from "@/components/custom/play-area-session-badge";
import { GAME_GRID_FRAME_WIDTH_CLASS } from "@/components/organisms/game-grid-frame";
import { STAGE_THEME_COLORS, stageThemeKey } from "@/theme/colors";
import { hexToRgba, isHexColor } from "@/lib/color";
import { GridCell } from "@/types/tile";
import { TILE_RENDER_TYPE, TileRenderType } from "@/types/tile-render";
import { getEnvStageId } from "@/utils/get-env-stage-id";
import { AlertCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useState } from "react";

const stageId = getEnvStageId() ?? "";
const stageAccent = STAGE_THEME_COLORS[stageThemeKey(stageId)].resultAccent;

const phaserLoaderAccentRef = { current: stageAccent };

const PhaserGameGrid = dynamic(
  () =>
    import("@/components/organisms/phaser-game-grid").then(
      (mod) => mod.PhaserGameGrid,
    ),
  {
    ssr: false,
    loading: () => {
      console.log("loading");
      console.log(
        "phaserLoaderAccentRef.current",
        phaserLoaderAccentRef.current,
      );
      return (
        <GameGridFrameSkeleton
          accentColor={phaserLoaderAccentRef.current}
          className="mx-auto"
        />
      );
    },
  },
);

interface GamePlayAreaProps {
  readonly shouldRenderGrid: boolean;
  readonly animateTileEntrance?: boolean;
  readonly mobileInsetScaleOverride?: number | null;
  readonly tileType?: TileRenderType;
  readonly grid: GridCell[][];
  readonly theme: { primary: string; glow: string; background: string };
  readonly showSessionExpiredAlert?: boolean;
  readonly sessionExpiredLabel?: string;
  readonly onTileClick: (x: number, y: number) => void;
  readonly isSolvedHighlightActive?: boolean;
  readonly isBoardTransitionActive?: boolean;
  readonly hintMessage?: string | null;
  readonly hintIsWon?: boolean;
  readonly hintIsTimeUp?: boolean;
  readonly hintReserveVerticalSlot?: boolean;
  /** Tutorial shows Demo, live rounds show Live; omit before welcome / loading. */
  readonly sessionBadgeLabel?: string | null;
}

const resolveBorderBurstPiece = (index: number, total: number) => {
  const perimeter = index / total;
  const side = Math.floor(perimeter * 4);
  const sideProgress = (perimeter * 4) % 1;

  if (side === 0) {
    return {
      left: `${sideProgress * 100}%`,
      top: "0%",
      xDrift: 0,
      yDrift: -90,
    };
  }
  if (side === 1) {
    return {
      left: "100%",
      top: `${sideProgress * 100}%`,
      xDrift: 90,
      yDrift: 0,
    };
  }
  if (side === 2) {
    return {
      left: `${(1 - sideProgress) * 100}%`,
      top: "100%",
      xDrift: 0,
      yDrift: 90,
    };
  }

  return {
    left: "0%",
    top: `${(1 - sideProgress) * 100}%`,
    xDrift: -90,
    yDrift: 0,
  };
};

export function GamePlayArea({
  shouldRenderGrid,
  animateTileEntrance = true,
  mobileInsetScaleOverride = null,
  tileType = TILE_RENDER_TYPE.FILLED,
  grid,
  theme,
  showSessionExpiredAlert = false,
  sessionExpiredLabel = "",
  onTileClick,
  isSolvedHighlightActive = false,
  isBoardTransitionActive = false,
  hintMessage = null,
  hintIsWon = false,
  hintIsTimeUp = false,
  hintReserveVerticalSlot = false,
  sessionBadgeLabel = null,
}: GamePlayAreaProps) {
  const [dismissSession, setDismissSession] = useState(false);

  const accentHex = isHexColor(theme.primary)
    ? theme.primary
    : stageAccent;

  return (
    <div className="relative flex min-h-0 w-full flex-1 self-stretch flex-col items-center justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className={`relative mx-auto w-full max-w-[24.5rem] ${GAME_GRID_FRAME_WIDTH_CLASS}`}
      >
        <AnimatePresence>
          {!dismissSession && showSessionExpiredAlert ? (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-none fixed bottom-[max(18px,env(safe-area-inset-bottom))] left-1/2 z-[60] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 shadow-2xl"
            >
              <div className="pointer-events-auto relative w-full rounded-2xl p-4 flex gap-4 bg-red-950/40 border border-red-500/40 backdrop-blur-md">
                <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-500/20">
                  <AlertCircle className="w-5 h-5 text-red-300" strokeWidth={2.5} />
                </div>
                <div className="flex-1 flex flex-col justify-center min-w-0 py-0.5">
                  <h3 className="text-base font-semibold tracking-tight text-red-100 text-left">
                    Session Expired
                  </h3>
                  <p className="text-sm mt-1 font-medium opacity-90 leading-snug text-red-100 text-left">
                    {sessionExpiredLabel || "Mock Error: Session Expired (Please refresh)"}
                  </p>
                </div>
                <button
                  onClick={() => setDismissSession(true)}
                  className="absolute top-4 right-4 p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 transition-all text-red-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {shouldRenderGrid ? (
          <motion.div
            className="relative w-full"
            animate={
              isBoardTransitionActive
                ? {
                    scale: [1, 1.028, 1.012],
                    filter: [
                      "brightness(1) saturate(1)",
                      "brightness(1.28) saturate(1.35)",
                      "brightness(1.12) saturate(1.1)",
                    ],
                  }
                : { scale: 1, filter: "brightness(1) saturate(1)" }
            }
            transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <PhaserGameGrid
              grid={grid}
              theme={theme}
              onTileClick={onTileClick}
              animateTileEntrance={animateTileEntrance}
              mobileInsetScaleOverride={mobileInsetScaleOverride}
              tileType={tileType}
            />
            {sessionBadgeLabel ? (
              <PlayAreaSessionBadge
                label={sessionBadgeLabel}
                accentColor={theme.primary}
              />
            ) : null}
            <AnimatePresence>
              {isSolvedHighlightActive ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="pointer-events-none absolute inset-0 z-20 rounded-2xl border-[3px]"
                  style={{
                    borderColor: hexToRgba(accentHex, 0.88),
                    boxShadow: `0 0 70px ${hexToRgba(accentHex, 0.58)}, 0 0 22px ${hexToRgba(accentHex, 0.82)}`,
                  }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      backgroundColor: hexToRgba(accentHex, 0.22),
                    }}
                    animate={{
                      opacity: [0.2, 0.8, 0.35],
                      scale: [1, 1.018, 1],
                    }}
                    transition={{
                      duration: 0.38,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <AnimatePresence>
              {isBoardTransitionActive ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-2xl"
                >
                  {Array.from({ length: 28 }, (_, i) => {
                    const { left, top, xDrift, yDrift } =
                      resolveBorderBurstPiece(i, 28);
                    return (
                      <motion.span
                        key={`board-burst-${i}`}
                        className="absolute h-2 w-2 rounded-full"
                        style={{
                          left,
                          top,
                          backgroundColor:
                            i % 2 === 0 ? theme.primary : "#7dd3fc",
                          boxShadow: `0 0 14px ${theme.primary}`,
                        }}
                        initial={{ opacity: 0, scale: 0.6, x: 0, y: 0 }}
                        animate={{
                          opacity: [0, 1, 0],
                          scale: [0.6, 1.2, 0.7],
                          x: [0, xDrift],
                          y: [0, yDrift],
                        }}
                        transition={{
                          duration: 0.46,
                          delay: (i % 7) * 0.014,
                          ease: "easeOut",
                        }}
                      />
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : (
          <GameGridFrameSkeleton
            accentColor={theme.primary}
            className="mx-auto"
          />
        )}
        <GameHintBanner
          message={hintMessage}
          isWon={hintIsWon}
          isTimeUp={hintIsTimeUp}
          accentColor={theme.primary}
          reserveVerticalSlot={hintReserveVerticalSlot}
        />
      </div>
    </div>
  );
}
