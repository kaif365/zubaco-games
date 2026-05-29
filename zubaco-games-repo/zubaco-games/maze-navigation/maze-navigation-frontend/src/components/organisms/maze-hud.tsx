import { useFadeSlideMotion } from "@/components/motion/use-fade-slide-motion";
import { MAZE_TIMER_LOW_WARNING_SECONDS } from "@/constants/maze";
import { APP_COLOR } from "@/theme/color";
import {
  isMazePlayModeDemo,
  type MazePlayMode,
} from "@/utils/maze/maze-play-mode";
import {
  Flag,
  FlaskConical,
  Settings,
  Timer,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export interface MazeHudProps {
  readonly playMode: MazePlayMode;
  readonly level: number;
  readonly timer: number;
  readonly soundEffectsEnabled: boolean;
  readonly onToggleSoundEffects: (enabled: boolean) => void;
  readonly onStartFresh: () => void | Promise<void>;
  readonly isStartFreshPending?: boolean;
  readonly onDone?: () => void;
  /** When true, level/time chips show pulse placeholders instead of store defaults. */
  readonly isMetricsLoading?: boolean;
}

interface MetricChipProps {
  readonly label: string;
  readonly value: string;
  readonly icon: typeof Flag;
  readonly isTimerLowWarning?: boolean;
}

export function MetricChipSkeleton() {
  return (
    <motion.div
      layout
      className="flex min-w-0 items-center gap-2 rounded-full px-3 py-2"
      style={{ background: APP_COLOR.whiteSoft10 }}
    >
      <div
        className="h-8 w-8 shrink-0 animate-pulse rounded-full"
        style={{ backgroundColor: APP_COLOR.accentSoft20 }}
        aria-hidden
      />
      <span className="min-w-0 leading-none">
        <motion.div
          layout
          className="mb-1 h-2 w-10 animate-pulse rounded"
          style={{ backgroundColor: APP_COLOR.accentSoft60 }}
          aria-hidden
        />
        <motion.div
          layout
          className="h-4 w-12 animate-pulse rounded"
          style={{ backgroundColor: APP_COLOR.panel }}
          aria-hidden
        />
      </span>
    </motion.div>
  );
}

function MetricChip({
  label,
  value,
  icon: Icon,
  isTimerLowWarning = false,
}: Readonly<MetricChipProps>) {
  const urgentClass = isTimerLowWarning ? "maze-timer-urgent" : "";

  return (
    <div
      className="flex min-w-0 items-center gap-2 rounded-full px-3 py-2"
      style={{ background: APP_COLOR.whiteSoft10 }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: APP_COLOR.accentSoft20, color: APP_COLOR.accent }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 leading-none">
        <span
          className="block text-[9px] font-bold uppercase tracking-[0.22em]"
          style={{ color: APP_COLOR.accentSoft60 }}
        >
          {label}
        </span>
        <span
          className={`block truncate font-mono text-sm font-bold${isTimerLowWarning ? ` ${urgentClass}` : ""}`}
          style={{
            color: isTimerLowWarning ? APP_COLOR.danger : APP_COLOR.white,
          }}
        >
          {value}
        </span>
      </span>
    </div>
  );
}

export function MazeHud({
  playMode,
  level,
  timer,
  soundEffectsEnabled,
  onToggleSoundEffects,
  onStartFresh,
  isStartFreshPending = false,
  onDone,
  isMetricsLoading = false,
}: Readonly<MazeHudProps>) {
  const { t } = useTranslation();
  const settingsMotion = useFadeSlideMotion();
  const isDemo = isMazePlayModeDemo(playMode);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const minutes = Math.floor(timer / 60);
  const seconds = (timer % 60).toString().padStart(2, "0");
  const isTimerLowWarning = !isDemo && timer <= MAZE_TIMER_LOW_WARNING_SECONDS;

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isSettingsOpen]);

  return (
    <div className="relative z-20 mb-1 flex w-full max-w-md flex-col gap-3">
      <div className="flex w-full items-center justify-end">
        <div
          className="relative z-30 flex items-center gap-2"
          ref={settingsRef}
        >
          {isDemo && onDone ? (
            <button
              type="button"
              onClick={onDone}
              className="rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] transition hover:scale-[1.02] active:scale-[0.98]"
              style={{
                borderColor: APP_COLOR.accentSoft40,
                background: APP_COLOR.panelSoft,
                color: APP_COLOR.accentBright,
                boxShadow: `0 0 16px ${APP_COLOR.frameShadow}`,
              }}
            >
              {t("hud.done")}
            </button>
          ) : null}
          <button
            type="button"
            aria-label={t("hud.openSettings")}
            onClick={() => {
              setIsSettingsOpen((open) => !open);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border transition hover:scale-[1.04] active:scale-[0.97]"
            style={{
              borderColor: APP_COLOR.accentSoft40,
              background: APP_COLOR.panelSoft,
              color: APP_COLOR.accentBright,
              boxShadow: `0 0 16px ${APP_COLOR.frameShadow}`,
            }}
          >
            <Settings className="h-5 w-5" />
          </button>

          <AnimatePresence>
            {isSettingsOpen ? (
              <motion.div
                key="maze-settings"
                className="absolute right-0 top-full z-50 mt-3 w-80 min-w-[18rem] rounded-3xl border p-4 shadow-2xl backdrop-blur-xl"
                style={{
                  background: APP_COLOR.panelSoft,
                  borderColor: APP_COLOR.accentSoft30,
                }}
                {...settingsMotion}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-white">
                    {t("hud.settings")}
                  </p>
                  <button
                    type="button"
                    aria-label={t("hud.closeSettings")}
                    onClick={() => {
                      setIsSettingsOpen(false);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ color: APP_COLOR.white }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleSoundEffects(!soundEffectsEnabled);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition hover:bg-white/5"
                    style={{ borderColor: APP_COLOR.whiteSoft10 }}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{
                          background: APP_COLOR.accentSoft20,
                          color: APP_COLOR.accentBright,
                        }}
                      >
                        {soundEffectsEnabled ? (
                          <Volume2 className="h-4 w-4" />
                        ) : (
                          <VolumeX className="h-4 w-4" />
                        )}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-white">
                          {t("hud.soundEffects")}
                        </span>
                        <span
                          className="block text-[11px] uppercase tracking-[0.18em]"
                          style={{ color: APP_COLOR.accentSoft60 }}
                        >
                          {soundEffectsEnabled
                            ? t("hud.soundOn")
                            : t("hud.soundOff")}
                        </span>
                      </span>
                    </span>
                    <span
                      className="flex h-6 w-11 items-center rounded-full p-1 transition"
                      style={{
                        background: soundEffectsEnabled
                          ? APP_COLOR.accentSoft40
                          : APP_COLOR.whiteSoft10,
                        justifyContent: soundEffectsEnabled
                          ? "flex-end"
                          : "flex-start",
                      }}
                    >
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ background: APP_COLOR.white }}
                      />
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isStartFreshPending}
                    onClick={() => {
                      setIsSettingsOpen(false);
                      void onStartFresh();
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition hover:bg-white/5 disabled:cursor-wait disabled:opacity-70"
                    style={{ borderColor: APP_COLOR.whiteSoft10 }}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{
                          background: APP_COLOR.accentSoft20,
                          color: APP_COLOR.accentBright,
                        }}
                      >
                        <FlaskConical className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <span className="text-sm font-semibold text-white">
                            {t("hud.startFresh")}
                          </span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]"
                            style={{
                              background: APP_COLOR.accentSoft20,
                              color: APP_COLOR.accentSoft60,
                            }}
                          >
                            {t("hud.testing")}
                          </span>
                        </span>
                        <span
                          className="block text-[11px] uppercase tracking-[0.18em]"
                          style={{ color: APP_COLOR.accentSoft60 }}
                        >
                          {t("hud.returnHome")}
                        </span>
                      </span>
                    </span>
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        className="relative z-10 mx-auto flex min-w-0 items-center justify-center gap-2 rounded-full border px-2 py-2 backdrop-blur-md"
        style={{
          background: APP_COLOR.panelSoft,
          borderColor: APP_COLOR.accentSoft30,
        }}
      >
        {isMetricsLoading ? (
          <>
            <MetricChipSkeleton />
            <MetricChipSkeleton />
          </>
        ) : isDemo ? (
          <>
            <MetricChip
              label={t("hud.level")}
              value={level.toString().padStart(2, "0")}
              icon={Flag}
            />
            <MetricChip
              label={t("hud.mode")}
              value={t("hud.demo")}
              icon={Flag}
            />
          </>
        ) : (
          <>
            <MetricChip
              label={t("hud.level")}
              value={level.toString().padStart(2, "0")}
              icon={Flag}
            />
            <MetricChip
              label={t("hud.time")}
              value={`${minutes}:${seconds}`}
              icon={Timer}
              isTimerLowWarning={isTimerLowWarning}
            />
          </>
        )}
      </motion.div>
    </div>
  );
}
