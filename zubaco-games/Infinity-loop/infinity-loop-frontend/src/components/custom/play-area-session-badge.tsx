"use client";

import { DEFAULT_LEVEL_PALETTE_PRIMARY } from "@/constants/theme-colors";
import { hexToRgba, isHexColor, mixHexTowardWhite } from "@/lib/color";

interface PlayAreaSessionBadgeProps {
  readonly label: string;
  readonly accentColor: string;
}

/** Top-right overlay inside the grid frame (tutorial = Demo, live = Live). */
export function PlayAreaSessionBadge({
  label,
  accentColor,
}: PlayAreaSessionBadgeProps) {
  const accentHex = isHexColor(accentColor)
    ? accentColor
    : DEFAULT_LEVEL_PALETTE_PRIMARY;
  const pingBrightHex = mixHexTowardWhite(accentHex, 0.44);

  return (
    <div className="pointer-events-none absolute top-2.5 right-2.5 z-[35] sm:top-3 sm:right-3">
      <span
        className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/95 shadow-lg backdrop-blur-md"
        style={{
          borderColor: hexToRgba(accentHex, 0.55),
          background: `linear-gradient(135deg, ${hexToRgba(accentHex, 0.28)} 0%, ${hexToRgba(accentHex, 0.1)} 100%)`,
          boxShadow: `0 0 20px ${hexToRgba(accentHex, 0.28)}, inset 0 1px 0 ${hexToRgba(accentHex, 0.35)}`,
        }}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-[0.58]"
            style={{ backgroundColor: hexToRgba(pingBrightHex, 0.92) }}
            aria-hidden="true"
          />
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{
              backgroundColor: pingBrightHex,
              boxShadow: `0 0 10px ${hexToRgba(pingBrightHex, 0.95)}`,
            }}
          />
        </span>
        {label}
      </span>
    </div>
  );
}
