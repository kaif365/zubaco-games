import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

import { useRequestDevAuthRefresh } from "@/hooks/use-dev-auth";
import {
  GameFailureScreen,
  GameSuccessScreen,
} from "@/section/results/game-result-screen";
import { useDemoStore } from "@/store/demo";
import { useLiveStore } from "@/store/live";
import { STAGE_THEME_COLORS } from "@/theme/stage-colors";
import type { StageId } from "@/types/stage-theme";
import {
  getConfiguredUiStageId,
  normalizeStageId,
} from "@/utils/stage/stage-utils";
import { paths } from "@app/router/routes";
import { markDailyComplete } from "@/features/maze-navigation/components/DailyChallenge";

export default function ResultPage() {
  const navigate = useNavigate();
  const requestDevAuthRefresh = useRequestDevAuthRefresh();
  const { result, clear } = useLiveStore(
    useShallow((s) => ({ result: s.result, clear: s.clear })),
  );
  const goToStart = useDemoStore((s) => s.goToStart);
  const clearLiveSession = useLiveStore((s) => s.clearLiveSession);
  const hadResultRef = useRef(false);
  const [isContinuePending, setIsContinuePending] = useState(false);

  useEffect(() => {
    if (result) {
      hadResultRef.current = true;
      if (result.variant !== 'failure' && sessionStorage.getItem('maze_daily_active') === '1') {
        sessionStorage.removeItem('maze_daily_active');
        markDailyComplete();
      }
      return;
    }
    if (!hadResultRef.current) {
      navigate(paths.home, { replace: true });
    }
  }, [result, navigate]);

  if (!result) {
    const stage = getConfiguredUiStageId();
    const theme = STAGE_THEME_COLORS[stage];
    return (
      <motion.div
        className="resultViewport"
        style={{ backgroundColor: theme.background }}
        aria-busy="true"
        aria-label="Loading results"
      />
    );
  }

  const stage: StageId = normalizeStageId(result.stage);
  const score = Number.isFinite(result.score) ? Math.max(0, result.score) : 0;
  const completedGames = Number.isFinite(result.completed)
    ? Math.max(0, result.completed)
    : 0;
  const totalGames = Number.isFinite(result.total)
    ? Math.max(1, result.total, completedGames)
    : Math.max(1, completedGames);

  const handleContinue = (nextStage: StageId) => {
    if (isContinuePending) {
      return;
    }
    void (async () => {
      setIsContinuePending(true);
      try {
        clear();
        clearLiveSession();
        requestDevAuthRefresh();
        goToStart(nextStage);
        navigate(paths.home, { replace: true });
      } finally {
        setIsContinuePending(false);
      }
    })();
  };

  const continueProps = {
    isContinueDisabled: isContinuePending,
  };

  if (result.variant === "failure") {
    return (
      <GameFailureScreen
        stage={stage}
        score={score}
        completedGames={completedGames}
        totalGames={totalGames}
        onContinue={handleContinue}
        {...continueProps}
      />
    );
  }

  return (
    <GameSuccessScreen
      stage={stage}
      score={score}
      completedGames={completedGames}
      totalGames={totalGames}
      onContinue={handleContinue}
      {...continueProps}
    />
  );
}
