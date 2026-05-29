"use client";

import { Typography } from "@/components/atoms/typography";
import { cn } from "@/utils/core";
import { motion } from "motion/react";

interface GameHeaderLogoProps {
  readonly name: string;
  readonly tagline: string;
  readonly accentColor: string;
  /** Latin headings use uppercase + wide tracking; Devanagari keeps sentence case. */
  readonly latinHeadingStyle?: boolean;
}

export const GameHeaderLogo = ({
  name,
  tagline,
  accentColor,
  latinHeadingStyle = true,
}: GameHeaderLogoProps) => {
  const accentGlow = `${accentColor}66`;
  const softAccentGlow = `${accentColor}33`;

  return (
    <div className="flex items-center sm:gap-4 gap-2">
      <motion.div
        initial={{ rotate: -8, opacity: 0.7 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-8 h-8 border-2 rounded-lg flex items-center justify-center relative border-current"
        style={{
          color: accentColor,
          boxShadow: `0 0 14px ${softAccentGlow}, 0 0 24px ${softAccentGlow}`,
        }}
      >
        <div className="w-4 h-4 border-b-2 border-r-2 rounded-br-lg border-current" />
      </motion.div>
      <div>
        <Typography
          className={cn(
            "text-xl font-semibold leading-none text-slate-100 tracking-tight",
            latinHeadingStyle && "uppercase",
          )}
          style={{
            fontFamily: "var(--font-display)",
            textShadow: `0 0 10px ${softAccentGlow}, 0 0 22px ${accentGlow}`,
          }}
        >
          {name}
        </Typography>
        <Typography
          variant="p"
          className={cn(
            "text-[10px] font-medium text-slate-200/80 opacity-100 sm:text-[12px]",
            latinHeadingStyle
              ? "uppercase tracking-[0.2em]"
              : "normal-case tracking-normal",
          )}
          style={{
            fontFamily: "var(--font-display)",
            textShadow: `0 0 8px ${softAccentGlow}, 0 0 18px ${softAccentGlow}`,
          }}
        >
          {tagline}
        </Typography>
      </div>
    </div>
  );
};
