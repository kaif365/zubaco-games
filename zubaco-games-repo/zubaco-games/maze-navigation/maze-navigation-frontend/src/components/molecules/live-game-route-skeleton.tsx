/** Shared maze play shell while route content or session bootstrap is still loading (demo and live). */
import { MazeControls } from "@/components/organisms/maze-controls";
import {
  MazeHud,
  MetricChipSkeleton,
  type MazeHudProps,
} from "@/components/organisms/maze-hud";
import { useDemoStore } from "@/store/demo";
import { useLiveStore } from "@/store/live";
import { useSettingsStore } from "@/store/settings";
import { APP_COLOR } from "@/theme/color";
import { isMazePlayModeDemo, MazePlayMode } from "@/utils/maze/maze-play-mode";
import { paths } from "@app/router/routes";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export type LiveGameRouteSkeletonProps = {
  readonly interactiveHud?: boolean;
} & Partial<MazeHudProps>;

function StaticHudSkeleton() {
  return (
    <div className="relative z-20 mb-1 flex w-full max-w-md flex-col items-center gap-3">
      <div className="flex w-full items-center justify-end">
        <div
          className="h-11 w-11 shrink-0 animate-pulse rounded-full border"
          style={{
            borderColor: APP_COLOR.accentSoft40,
            background: APP_COLOR.panelSoft,
          }}
          aria-hidden
        />
      </div>
      <div
        className="relative z-10 flex min-w-0 items-center justify-center gap-2 rounded-full border px-2 py-2 backdrop-blur-md"
        style={{
          background: APP_COLOR.panelSoft,
          borderColor: APP_COLOR.accentSoft30,
        }}
      >
        <MetricChipSkeleton />
        <MetricChipSkeleton />
      </div>
    </div>
  );
}

export function LiveGameRouteSkeleton(props: LiveGameRouteSkeletonProps = {}) {
  const { t } = useTranslation();
  const demoLevel = useDemoStore((s) => s.level);
  const demoTimer = useDemoStore((s) => s.timer);
  const liveLevel = useLiveStore((s) => s.level);
  const liveTimer = useLiveStore((s) => s.timer);
  const soundEffectsEnabled = useSettingsStore((s) => s.soundEffectsEnabled);

  const hudProps = useMemo((): MazeHudProps | null => {
    if (
      !props.interactiveHud ||
      props.playMode === undefined ||
      props.onToggleSoundEffects === undefined ||
      props.onStartFresh === undefined
    ) {
      return null;
    }

    const isDemo = isMazePlayModeDemo(props.playMode);

    return {
      playMode: props.playMode,
      level: props.level ?? (isDemo ? demoLevel : liveLevel),
      timer: props.timer ?? (isDemo ? demoTimer : liveTimer),
      soundEffectsEnabled: props.soundEffectsEnabled ?? soundEffectsEnabled,
      onToggleSoundEffects: props.onToggleSoundEffects,
      onStartFresh: props.onStartFresh,
      isStartFreshPending: props.isStartFreshPending,
      onDone: props.onDone,
      isMetricsLoading: props.isMetricsLoading ?? true,
    };
  }, [demoLevel, demoTimer, liveLevel, liveTimer, props, soundEffectsEnabled]);

  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="relative min-h-dvh w-full"
      style={{
        background: APP_COLOR.background,
        color: APP_COLOR.accent,
      }}
    >
      <span className="sr-only">{t("loading.game")}</span>

      <div className="mx-auto flex w-full max-w-[600px] flex-col items-center gap-2 px-4 pb-4 pt-4">
        {hudProps ? <MazeHud {...hudProps} /> : <StaticHudSkeleton />}

        <div
          className="relative h-[min(58dvh,32rem)] w-full max-w-md min-h-0 shrink-0 overflow-hidden rounded-2xl border-4"
          style={{
            background: APP_COLOR.black,
            borderColor: APP_COLOR.panelBorder,
            boxShadow: `0 0 50px -12px ${APP_COLOR.frameShadow}`,
          }}
        >
          <div className="absolute inset-0 flex min-h-0 items-center justify-center">
            <div
              className="aspect-square w-[min(100%,14rem)] max-h-[min(100%,14rem)] animate-pulse rounded-xl"
              style={{ backgroundColor: APP_COLOR.panel }}
              aria-hidden
            />
          </div>
        </div>

        <div className="pointer-events-none flex w-full shrink-0 flex-col items-center opacity-90">
          <MazeControls />
          <p
            className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em]"
            style={{ color: APP_COLOR.accentSoft40 }}
          >
            {t("controls.hint")}
          </p>
        </div>
      </div>
    </main>
  );
}

/** Suspense / demo bootstrap fallback with working settings button and menu. */
export function LiveGameRouteSkeletonWithHud({
  playMode,
  onDone,
}: Readonly<{
  playMode: MazePlayMode;
  onDone?: () => void;
}>) {
  const navigate = useNavigate();
  const soundEffectsEnabled = useSettingsStore((s) => s.soundEffectsEnabled);
  const setSoundEffectsEnabled = useSettingsStore(
    (s) => s.setSoundEffectsEnabled,
  );
  const demoLevel = useDemoStore((s) => s.level);
  const demoTimer = useDemoStore((s) => s.timer);
  const liveLevel = useLiveStore((s) => s.level);
  const liveTimer = useLiveStore((s) => s.timer);
  const isDemo = isMazePlayModeDemo(playMode);

  const navigateHome = () => {
    navigate(paths.home, { replace: true });
  };

  return (
    <LiveGameRouteSkeleton
      interactiveHud
      playMode={playMode}
      level={isDemo ? demoLevel : liveLevel}
      timer={isDemo ? demoTimer : liveTimer}
      soundEffectsEnabled={soundEffectsEnabled}
      onToggleSoundEffects={setSoundEffectsEnabled}
      onStartFresh={navigateHome}
      onDone={onDone ?? (isDemo ? navigateHome : undefined)}
    />
  );
}
