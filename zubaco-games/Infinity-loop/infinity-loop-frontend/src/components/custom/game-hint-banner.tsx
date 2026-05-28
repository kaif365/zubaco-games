"use client";

import { Typography } from "@/components/atoms/typography";
import { DEFAULT_LEVEL_PALETTE_PRIMARY } from "@/constants/theme-colors";
import { hexToRgba, isHexColor } from "@/lib/color";
import { Lightbulb } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

/** Matches approximate hint card height so the column does not shift when hint mounts. */
export const GAME_HINT_SLOT_MIN_HEIGHT_CLASS = "min-h-[4.75rem]";

interface GameHintBannerProps {
  readonly message: string | null;
  readonly isWon: boolean;
  readonly isTimeUp: boolean;
  readonly accentColor: string;
  /** When true, reserve hint-row height so the grid stays vertically aligned across rounds. */
  readonly reserveVerticalSlot?: boolean;
}

export function GameHintBanner({
  message,
  isWon,
  isTimeUp,
  accentColor,
  reserveVerticalSlot = false,
}: GameHintBannerProps) {
  const safeAccent = isHexColor(accentColor)
    ? accentColor
    : DEFAULT_LEVEL_PALETTE_PRIMARY;
  const shouldShowBanner = Boolean(message) && !isWon && !isTimeUp;

  const slotMinHeightClass = reserveVerticalSlot
    ? GAME_HINT_SLOT_MIN_HEIGHT_CLASS
    : "min-h-0";

  return (
    <div
      className={`mx-auto mt-2 flex w-full shrink-0 items-center justify-center ${slotMinHeightClass}`}
      aria-live="polite"
    >
      <div className="flex w-full justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {shouldShowBanner ? (
            <motion.div
              key="hint-message"
              className="mx-auto w-full max-w-[24rem]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div
                className="w-full px-4 py-3 rounded-xl border text-sky-100 shadow-[0_0_34px_rgba(56,189,248,0.5)] backdrop-blur-md animate-neon-breath sm:w-auto"
                style={{
                  borderColor: `${safeAccent}aa`,
                  background: `linear-gradient(90deg, ${safeAccent}33 0%, ${safeAccent}1a 50%, ${safeAccent}40 100%)`,
                  boxShadow: `0 0 34px ${safeAccent}77`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 min-w-7 min-h-7 items-center justify-center rounded-full border"
                    style={{
                      borderColor: hexToRgba(safeAccent, 0.76),
                      backgroundColor: hexToRgba(safeAccent, 0.35),
                      boxShadow: `0 0 16px ${hexToRgba(safeAccent, 0.45)}`,
                    }}
                  >
                    <Lightbulb
                      className="h-4 w-4"
                      style={{ color: "#FFFFFF" }}
                      aria-hidden="true"
                    />
                  </span>
                  <Typography
                    variant="p"
                    className="text-sm font-semibold tracking-normal text-sky-50"
                  >
                    {message}
                  </Typography>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
