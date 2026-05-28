"use client";

import { DEFAULT_LEVEL_PALETTE_PRIMARY } from "@/constants/theme-colors";
import { hexToRgba, isHexColor } from "@/lib/color";

interface ThemeTopGradientOverlayProps {
  readonly accentColor: string;
  readonly className?: string;
}

/**
 * Subtle top-of-viewport wash using the active theme accent. Pointer-events none.
 */
export function ThemeTopGradientOverlay({
  accentColor,
  className = "",
}: ThemeTopGradientOverlayProps) {
  const safe = isHexColor(accentColor)
    ? accentColor
    : DEFAULT_LEVEL_PALETTE_PRIMARY;
  const top = hexToRgba(safe, 0.95);
  const mid = hexToRgba(safe, 0.32);
  const low = hexToRgba(safe, 0.18);
  const shadowGlow = hexToRgba(safe, 0.72);

  return (
    <div
      aria-hidden
      className={`pointer-events-none inset-x-0 h-[10vh] absolute top-[-5vh] left-0 right-0 z-[999] border-0 filter blur-[38px] mx-auto max-w-full ${className}`.trim()}
      style={{
        background: `linear-gradient(180deg, ${top} 0%, ${mid} 55%, ${low} 82%, transparent 100%)`,
        boxShadow: `0 0 108px ${shadowGlow}`,
      }}
    />
  );
}
