"use client";

import { Typography } from "@/components/atoms/typography";
import { DEFAULT_LEVEL_PALETTE_PRIMARY } from "@/constants/theme-colors";
import { hexToRgba, isHexColor } from "@/lib/color";
import { useTranslation } from "react-i18next";

interface MobileGameStatsChipProps {
  readonly moves: number;
  readonly timeLeftSeconds: number;
  /** Tutorial: show ∞ in the time segment (still two-column layout like live rounds). */
  readonly timeShowsInfinity?: boolean;
  readonly showSkeleton?: boolean;
  readonly accentColor: string;
}

export function MobileGameStatsChip({
  moves,
  timeLeftSeconds,
  timeShowsInfinity = false,
  showSkeleton = false,
  accentColor,
}: MobileGameStatsChipProps) {
  const { t } = useTranslation();
  const accentHex = isHexColor(accentColor)
    ? accentColor
    : DEFAULT_LEVEL_PALETTE_PRIMARY;

  const segmentClass =
    "flex min-w-[5.5rem] flex-col items-center justify-center gap-0.5 px-5 py-1.5";

  return (
    <div
      className="mb-2 mt-1 flex w-full shrink-0 justify-center self-center px-2"
      role="group"
      aria-label={`${t("header.moves")}, ${timeShowsInfinity ? t("game.timeUnlimitedAria") : t("header.time")}`}
    >
      <div
        className="inline-flex max-w-full items-stretch overflow-hidden rounded-full border shadow-lg backdrop-blur-md"
        style={{
          borderColor: hexToRgba(accentHex, 0.55),
          background: `linear-gradient(135deg, ${hexToRgba(accentHex, 0.2)} 0%, ${hexToRgba(accentHex, 0.07)} 100%)`,
          boxShadow: `0 0 20px ${hexToRgba(accentHex, 0.22)}, inset 0 1px 0 ${hexToRgba(accentHex, 0.3)}`,
        }}
      >
        <div className={segmentClass}>
          <Typography
            variant="small"
            className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/55"
          >
            {t("header.moves")}
          </Typography>
          {showSkeleton ? (
            <span
              className="h-7 w-9 rounded-md bg-white/18 animate-pulse"
              aria-hidden="true"
            />
          ) : (
            <Typography className="flex min-h-[1.75rem] items-center justify-center text-lg font-semibold tabular-nums text-white">
              {moves}
            </Typography>
          )}
        </div>

        <div
          className="my-2 w-px shrink-0 self-stretch bg-white/15"
          aria-hidden="true"
        />
        <div className={segmentClass}>
          <Typography
            variant="small"
            className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/55"
          >
            {t("header.time")}
          </Typography>
          {showSkeleton ? (
            <span
              className="h-7 w-11 rounded-md bg-white/18 animate-pulse"
              aria-hidden="true"
            />
          ) : timeShowsInfinity ? (
            <Typography
              className="flex min-h-[1.75rem] items-center justify-center text-lg font-semibold tabular-nums tracking-tight text-white"
              aria-label={t("game.timeUnlimitedAria")}
            >
              ∞
            </Typography>
          ) : (
            <Typography className="flex min-h-[1.75rem] items-center justify-center text-lg font-semibold tabular-nums text-white">
              {timeLeftSeconds}s
            </Typography>
          )}
        </div>
      </div>
    </div>
  );
}
