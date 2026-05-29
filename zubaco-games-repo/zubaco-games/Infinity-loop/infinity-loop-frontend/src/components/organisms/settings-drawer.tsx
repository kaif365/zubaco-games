// /components/organisms/settings-drawer.tsx
"use client";

import { Button } from "@/components/atoms/button";
import { Switch } from "@/components/atoms/switch";
import { Typography } from "@/components/atoms/typography";
import { DEFAULT_LEVEL_PALETTE_PRIMARY } from "@/constants/theme-colors";
import { hexToRgba, isHexColor } from "@/lib/color";
import useGameStore from "@/store/game";
import { GameConfig } from "@/types/game-config";
import { Info, Loader2, RefreshCw, Volume2, VolumeX, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly config: GameConfig;
  readonly accentColor: string;
  readonly soundEnabled: boolean;
  readonly setSoundEnabled: (e: boolean) => void;
  readonly volume: number;
  readonly setVolume: (v: number) => void;
  readonly onStartFreshDemoSession?: () => void | Promise<void>;
  readonly demoSessionPending?: boolean;
}

export const SettingsDrawer = ({
  isOpen,
  onClose,
  config,
  accentColor,
  soundEnabled,
  setSoundEnabled,
  volume,
  setVolume,
  onStartFreshDemoSession,
  demoSessionPending = false,
}: Props) => {
  const { t } = useTranslation();
  const instructionOverride = useGameStore((s) => s.instructionOverride);
  const cmsIntro = instructionOverride?.pages?.[0];
  const aboutHeading = cmsIntro?.title?.trim() || t("settings.about");
  const aboutBody =
    cmsIntro?.description?.trim() || config.gameMeta.description;
  const isMuted = !soundEnabled;
  const accentRgb = isHexColor(accentColor)
    ? accentColor
    : DEFAULT_LEVEL_PALETTE_PRIMARY;

  const handleSoundEnabledChange = (checked: boolean) => {
    if (checked) {
      setSoundEnabled(true);
      if (volume <= 0) {
        setVolume(0.5);
      }
    } else {
      setSoundEnabled(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-slate-950/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 230,
              mass: 0.9,
            }}
            className="absolute top-0 right-0 z-999 h-full w-full max-w-sm bg-[#000000] border-l border-[#2f261f] shadow-2xl p-8 flex flex-col backdrop-blur-xl"
            style={{
              boxShadow: `-12px 0 36px ${accentColor}22, 0 0 64px ${accentColor}1f`,
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="flex items-center justify-between mb-10">
              <Typography variant="h3">{t("settings.title")}</Typography>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-12 h-12 rounded-full border border-slate-700/30 hover:bg-white/5 hover:text-white text-slate-400 transition-all hover:scale-[1.04] active:scale-[0.97]"
                style={{
                  color: accentColor,
                  borderColor: `${accentColor}66`,
                  boxShadow: `0 0 10px ${accentColor}33, 0 0 24px ${accentColor}33`,
                }}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="space-y-10">
              {/* Sound */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {isMuted ? (
                      <VolumeX
                        className="w-5 h-5"
                        style={{ color: accentColor }}
                      />
                    ) : (
                      <Volume2
                        className="w-5 h-5"
                        style={{ color: accentColor }}
                      />
                    )}
                    <Typography variant="small">
                      {t("settings.audioEffects")}
                    </Typography>
                  </div>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={handleSoundEnabledChange}
                    aria-label={t("settings.audioEffectsAria")}
                    style={{
                      backgroundColor: soundEnabled ? accentColor : undefined,
                    }}
                  />
                </div>
              </section>

              {/* Demo: mock user session */}
              {onStartFreshDemoSession ? (
                <section
                  className="rounded-2xl border p-5"
                  style={{
                    borderColor: hexToRgba(accentRgb, 0.35),
                    backgroundColor: hexToRgba(accentRgb, 0.08),
                    boxShadow: `0 0 24px ${hexToRgba(accentRgb, 0.12)}`,
                  }}
                >
                  <Typography
                    variant="small"
                    className="mb-3 inline-block rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-100"
                    style={{
                      borderColor: hexToRgba(accentRgb, 0.45),
                      backgroundColor: hexToRgba(accentRgb, 0.14),
                    }}
                  >
                    {t("settings.demoFeatureOnly")}
                  </Typography>
                  <Typography className="mb-4 text-sm leading-relaxed text-slate-300/90">
                    {t("settings.demoSessionDescription")}
                  </Typography>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={demoSessionPending}
                    className="w-full text-slate-100 hover:bg-white/5"
                    style={{
                      borderColor: hexToRgba(accentRgb, 0.45),
                      boxShadow: `0 0 14px ${hexToRgba(accentRgb, 0.15)}`,
                    }}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={() => {
                      void onStartFreshDemoSession();
                    }}
                  >
                    {demoSessionPending ? (
                      <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4 shrink-0" />
                    )}
                    {t("settings.startFreshDemoSession")}
                  </Button>
                </section>
              ) : null}

              {/* About */}
              <section className="bg-slate-700/16 p-5 rounded-2xl border border-slate-600/30">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 shrink-0 text-white" />
                  <Typography
                    variant="p"
                    className="text-xs font-semibold text-white"
                  >
                    {aboutHeading}
                  </Typography>
                </div>
                <Typography className="text-sm leading-relaxed text-white">
                  {aboutBody}
                </Typography>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
