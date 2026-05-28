// /components/organisms/game-header.tsx
"use client";

import { Button } from "@/components/atoms/button";
import { GameHeaderLogo } from "@/components/molecules/game-header-logo";
import { ThemeTopGradientOverlay } from "@/components/organisms/theme-top-gradient-overlay";
import useGameStore from "@/store/game";
import { Lightbulb, Settings } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

interface Props {
  readonly onSettingsClick: () => void;
  readonly onHint: () => void;
  readonly showHintButton?: boolean;
  readonly isHintDisabled?: boolean;
  readonly primaryColor: string;
}

export const GameHeader = ({
  onSettingsClick,
  onHint,
  showHintButton = true,
  isHintDisabled = false,
  primaryColor,
}: Props) => {
  const { t, i18n } = useTranslation();
  const latinHeadingStyle = !i18n.language.toLowerCase().startsWith("hi");
  const cmsGameTitle = useGameStore(
    (s) => s.instructionOverride?.gameTitle?.trim() ?? "",
  );
  const cmsTagline = useGameStore(
    (s) => s.instructionOverride?.headerTagline?.trim() ?? "",
  );
  const accentColor = primaryColor;
  const softAccentGlow = `${accentColor}33`;
  const displayName =
    cmsGameTitle.length > 0 ? cmsGameTitle : t("game.brandName");
  const displayTagline =
    cmsTagline.length > 0 ? cmsTagline : t("game.brandTagline");

  return (
    <>
      <ThemeTopGradientOverlay accentColor={accentColor} />
      <div className="relative mb-1 w-full">
        <div className="relative z-999 flex w-full items-center justify-between py-3">
          <GameHeaderLogo
            name={displayName}
            tagline={displayTagline}
            accentColor={accentColor}
            latinHeadingStyle={latinHeadingStyle}
          />

          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex gap-2">
              {showHintButton ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onHint}
                  disabled={isHintDisabled}
                  aria-label={t("header.hintAria")}
                  className="w-12 h-12 rounded-full border border-slate-700/30 hover:bg-white/5 hover:text-white text-slate-400 transition-all hover:scale-[1.04] active:scale-[0.97]"
                  style={{
                    color: accentColor,
                    borderColor: `${accentColor}66`,
                    boxShadow: `0 0 10px ${softAccentGlow}, 0 0 24px ${softAccentGlow}`,
                  }}
                >
                  <Lightbulb className="w-5 h-5 group-hover/button:-translate-y-[1px]" />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                onClick={onSettingsClick}
                aria-label={t("header.settingsAria")}
                className="w-12 h-12 rounded-full border border-slate-700/30 hover:bg-white/5 hover:text-white text-slate-400 transition-all hover:scale-[1.04] active:scale-[0.97]"
                style={{
                  color: accentColor,
                  borderColor: `${accentColor}66`,
                  boxShadow: `0 0 10px ${softAccentGlow}, 0 0 24px ${softAccentGlow}`,
                }}
              >
                <Settings className="w-5 h-5 group-hover/button:rotate-45" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};
