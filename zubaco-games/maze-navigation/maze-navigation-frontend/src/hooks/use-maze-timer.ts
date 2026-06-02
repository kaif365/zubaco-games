import { useDemoStore } from "@/store/demo";
import { useLiveStore } from "@/store/live";
import { MazeGamePhase } from "@/types/maze-phase";
import { MazePlayMode } from "@/utils/maze/maze-play-mode";
import { getConfiguredUiStageId } from "@/utils/stage/stage-utils";
import { secondsRemainingUntil } from "@/utils/time/expiry-timer";
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

export function useMazeTimer(mode: MazePlayMode): void {
  const isDemo = mode === MazePlayMode.Demo;
  const demoPhase = useDemoStore((s) => s.phase);
  const livePhase = useLiveStore((s) => s.phase);
  const phase = isDemo ? demoPhase : livePhase;

  const demoTimer = useDemoStore((s) => s.timer);
  const liveTimer = useLiveStore((s) => s.timer);
  const timer = isDemo ? demoTimer : liveTimer;

  const demoDecrement = useDemoStore((s) => s.decrementTimer);
  const liveDecrement = useLiveStore((s) => s.decrementTimer);
  const decrementTimer = isDemo ? demoDecrement : liveDecrement;

  const demoSetTimer = useDemoStore((s) => s.setTimer);
  const liveSetTimer = useLiveStore((s) => s.setTimer);
  const setTimer = isDemo ? demoSetTimer : liveSetTimer;

  const hasLiveSession = useLiveStore((s) => s.hasActiveLiveSession);
  const liveSessionExpiryAt = useLiveStore((s) => s.session?.expiryAt);
  const { endGameEarly, publishTerminalResult } = useLiveStore(
    useShallow((s) => ({
      endGameEarly: s.endGameEarly,
      publishTerminalResult: s.publishTerminalResult,
    })),
  );

  const isPausedRef = useRef(false);

  // Pause timer on tab switch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && phase === MazeGamePhase.PLAYING) {
        isPausedRef.current = true;
      } else if (!document.hidden) {
        isPausedRef.current = false;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [phase]);

  useEffect(() => {
    if (isDemo) {
      return;
    }

    if (phase !== MazeGamePhase.PLAYING) {
      return;
    }

    if (hasLiveSession) {
      const tick = () => {
        if (liveSessionExpiryAt) {
          setTimer(secondsRemainingUntil(liveSessionExpiryAt));
        }
      };
      tick();
      const intervalId = globalThis.setInterval(tick, 1000);
      return () => {
        globalThis.clearInterval(intervalId);
      };
    }

    const intervalId = globalThis.setInterval(() => {
      if (isPausedRef.current) return;
      decrementTimer();
    }, 1000);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [
    decrementTimer,
    hasLiveSession,
    isDemo,
    liveSessionExpiryAt,
    phase,
    setTimer,
  ]);

  const liveTimeUpHandledRef = useRef(false);

  useEffect(() => {
    if (isDemo) {
      return;
    }

    if (phase !== MazeGamePhase.PLAYING || timer > 0) {
      liveTimeUpHandledRef.current = false;
      return;
    }

    if (liveTimeUpHandledRef.current) {
      return;
    }
    liveTimeUpHandledRef.current = true;

    const stageId = getConfiguredUiStageId();
    if (hasLiveSession) {
      void endGameEarly({ refreshStatus: false })
        .catch(() => {})
        .finally(() => {
          publishTerminalResult(stageId, "failure");
        });
      return;
    }
    publishTerminalResult(stageId, "failure");
  }, [
    endGameEarly,
    hasLiveSession,
    isDemo,
    phase,
    publishTerminalResult,
    timer,
  ]);
}
