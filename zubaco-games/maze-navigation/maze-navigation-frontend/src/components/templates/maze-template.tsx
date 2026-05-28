import { MazeCanvas } from "@/components/custom/maze/maze-canvas";
import {
  DemoTutorialScrim,
  DemoTutorialTapLayer,
} from "@/components/molecules/demo-tutorial-overlay";
import { MazeControls } from "@/components/organisms/maze-controls";
import { MazeHud } from "@/components/organisms/maze-hud";
import { useDemoStore } from "@/store/demo";
import { APP_COLOR } from "@/theme/color";
import { MazeGamePhase } from "@/types/maze-phase";
import {
  isDemoTutorialActive,
  type DemoTutorialStep,
} from "@/utils/maze/demo-tutorial";
import { isMazePlayModeDemo, MazePlayMode } from "@/utils/maze/maze-play-mode";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface MazeTemplateProps {
  readonly phase: MazeGamePhase;
  readonly level: number;
  readonly timer: number;
  readonly playMode: MazePlayMode;
  readonly soundEffectsEnabled: boolean;
  readonly onToggleSoundEffects: (enabled: boolean) => void;
  readonly onStartFresh: () => void | Promise<void>;
  readonly isStartFreshPending?: boolean;
  readonly onDone?: () => void;
}

function shouldDimHudForTutorial(step: DemoTutorialStep): boolean {
  return step === "controls";
}

function shouldDimCanvasForTutorial(step: DemoTutorialStep): boolean {
  return step === "controls";
}

export function MazeTemplate({
  phase,
  level,
  timer,
  playMode,
  soundEffectsEnabled,
  onToggleSoundEffects,
  onStartFresh,
  isStartFreshPending,
  onDone,
}: MazeTemplateProps) {
  const { t } = useTranslation();
  const isDemo = isMazePlayModeDemo(playMode);
  const currentLevelIndex = useDemoStore((s) => s.currentLevelIndex);
  const demoLevel0TutorialCompleted = useDemoStore(
    (s) => s.demoLevel0TutorialCompleted,
  );
  const demoTutorialStep = useDemoStore((s) => s.demoTutorialStep);
  const startDemoTutorial = useDemoStore((s) => s.startDemoTutorial);
  const demoLevel = useDemoStore((s) =>
    isDemo ? s.demoSession?.levels[s.currentLevelIndex] : null,
  );
  const demoLevelId = demoLevel?.levelId ?? null;

  useEffect(() => {
    if (
      !isDemo ||
      phase !== MazeGamePhase.PLAYING ||
      currentLevelIndex !== 0 ||
      demoLevel0TutorialCompleted
    ) {
      return;
    }
    startDemoTutorial();
  }, [
    currentLevelIndex,
    demoLevel0TutorialCompleted,
    demoLevelId,
    isDemo,
    phase,
    startDemoTutorial,
  ]);

  if (phase !== MazeGamePhase.PLAYING) {
    return null;
  }

  const tutorialActive = isDemo && isDemoTutorialActive(demoTutorialStep);
  const highlightControls = tutorialActive && demoTutorialStep === "controls";
  const dimHud = tutorialActive && shouldDimHudForTutorial(demoTutorialStep);
  const dimCanvas =
    tutorialActive && shouldDimCanvasForTutorial(demoTutorialStep);

  return (
    <main
      className="relative min-h-dvh w-full"
      style={{
        background: APP_COLOR.background,
        color: APP_COLOR.accent,
      }}
    >
      {tutorialActive ? <DemoTutorialTapLayer /> : null}
      <div className="mx-auto flex w-full max-w-[600px] flex-col items-center gap-2 px-4 pb-4 pt-4">
        <div className="relative w-full max-w-md">
          <DemoTutorialScrim
            show={dimHud}
            className="absolute inset-0 z-[8] rounded-xl"
          />
          <MazeHud
            playMode={playMode}
            level={level}
            timer={timer}
            soundEffectsEnabled={soundEffectsEnabled}
            onToggleSoundEffects={onToggleSoundEffects}
            onStartFresh={onStartFresh}
            isStartFreshPending={isStartFreshPending}
            onDone={onDone}
          />
        </div>
        <div
          className="relative h-[min(58dvh,32rem)] w-full max-w-md min-h-0 shrink-0 overflow-hidden rounded-2xl border-4"
          style={{
            background: APP_COLOR.black,
            borderColor: APP_COLOR.panelBorder,
            boxShadow: `0 0 50px -12px ${APP_COLOR.frameShadow}`,
          }}
        >
          <DemoTutorialScrim
            show={dimCanvas}
            className="absolute inset-0 z-[8] rounded-2xl"
          />
          <div className="absolute inset-0 min-h-0">
            <MazeCanvas playMode={playMode} />
          </div>
        </div>
        <div
          className={`relative z-20 flex w-full shrink-0 flex-col items-center${
            highlightControls ? " rounded-2xl p-2" : ""
          }`}
          style={
            highlightControls
              ? {
                  boxShadow: `0 0 0 2px ${APP_COLOR.infoSoft40}, 0 0 24px ${APP_COLOR.infoGlow}`,
                  border: `1px solid ${APP_COLOR.infoSoft60}`,
                  background: APP_COLOR.infoSoft20,
                }
              : undefined
          }
        >
          <MazeControls inputDisabled={tutorialActive} />
          <p
            className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] motion-reduce:animate-none"
            style={{
              color: highlightControls
                ? APP_COLOR.infoBright
                : APP_COLOR.accentSoft40,
              animation: highlightControls
                ? "pulse 2s ease-in-out infinite"
                : undefined,
            }}
          >
            {t("controls.hint")}
          </p>
        </div>
      </div>
    </main>
  );
}
