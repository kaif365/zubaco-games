"use client";

import { GAME_RESULT_VARIANT } from "@/constants/game-result";
import { useUser } from "@/context/user-context";
import {
  GameFailureScreen,
  GameSuccessScreen,
} from "@/section/results/game-result-screen";
import useGameStore, { type GameResultVariant } from "@/store/game";
import { clearLegacyUrlSearchParams } from "@/utils/clear-legacy-url-search-params";
import Storage from "@/utils/storage";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useShallow } from "zustand/shallow";

function assertNever(value: never): never {
  throw new Error(`Unexpected result variant: ${String(value)}`);
}

export default function ResultPage() {
  const router = useRouter();
  const { syncTokenFromStorage } = useUser();
  const { clearGameResult, result } = useGameStore(
    useShallow((state) => ({
      clearGameResult: state.clearGameResult,
      result: state.result,
    })),
  );

  useEffect(() => {
    if (!result) {
      router.replace("/");
    }
  }, [result, router]);

  if (!result) {
    return null;
  }

  const stage = result.stage;

  const parsedScore = result.score;
  const score = Number.isFinite(parsedScore) ? Math.max(0, parsedScore) : 0;

  const parsedCompleted = result.completed;
  const completedGames = Number.isFinite(parsedCompleted)
    ? Math.max(0, parsedCompleted)
    : 0;

  const parsedTotal = result.total;
  const totalGames = Number.isFinite(parsedTotal)
    ? Math.max(1, parsedTotal, completedGames)
    : Math.max(1, completedGames);

  const handleContinue = () => {
    void (async () => {
      Storage.clearAllStorageTypes();
      clearLegacyUrlSearchParams();
      await syncTokenFromStorage();
      clearGameResult();
      router.replace("/");
    })();
  };

  const variant: GameResultVariant = result.variant;
  switch (variant) {
    case GAME_RESULT_VARIANT.FAILURE:
      return (
        <GameFailureScreen
          stage={stage}
          score={score}
          completedGames={completedGames}
          totalGames={totalGames}
          onContinue={handleContinue}
        />
      );
    case GAME_RESULT_VARIANT.SUCCESS:
      return (
        <GameSuccessScreen
          stage={stage}
          score={score}
          completedGames={completedGames}
          totalGames={totalGames}
          onContinue={handleContinue}
        />
      );
    default:
      return assertNever(variant);
  }
}
