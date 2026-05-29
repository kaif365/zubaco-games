import React from "react";

interface HintCell {
  x: number;
  y: number;
}

interface UseHintControllerParams {
  levelIndex: number;
  hintedCells: HintCell[];
  isWon: boolean;
  triggerHint: () => HintCell | null;
  t: (key: string, values?: Record<string, string | number>) => string;
}

export const useHintController = ({
  levelIndex,
  hintedCells,
  isWon,
  triggerHint,
  t,
}: UseHintControllerParams) => {
  const [lastHint, setLastHint] = React.useState<HintCell | null>(null);
  const [isTutorialHintVisible, setIsTutorialHintVisible] =
    React.useState(true);
  const [isHintVisible, setIsHintVisible] = React.useState(false);

  React.useEffect(() => {
    if (lastHint) {
      const isStillHinted = hintedCells.some(
        (h) => h.x === lastHint.x && h.y === lastHint.y,
      );
      if (!isStillHinted) {
        setTimeout(() => setLastHint(null), 0);
      }
    }
  }, [hintedCells, lastHint]);

  React.useEffect(() => {
    if (lastHint || levelIndex <= 1) return;
    setTimeout(() => setIsHintVisible(false), 0);
  }, [lastHint, levelIndex]);

  React.useEffect(() => {
    if (isWon) {
      setTimeout(() => setLastHint(null), 0);
      setTimeout(() => setIsHintVisible(false), 0);
    }
    return undefined;
  }, [isWon]);

  const handleHint = React.useCallback(() => {
    if (levelIndex === 0 || levelIndex === 1) {
      setIsTutorialHintVisible((visible) => !visible);
      return;
    }

    if (isHintVisible) {
      setIsHintVisible(false);
      return;
    }

    if (lastHint) {
      setIsHintVisible(true);
      return;
    }

    const hint = triggerHint();
    if (!hint) return;
    setLastHint(hint);
    setIsHintVisible(true);
  }, [isHintVisible, lastHint, levelIndex, triggerHint]);

  const levelHintMessage = React.useMemo((): string | null => {
    if (levelIndex === 0) {
      return isTutorialHintVisible ? t("game.hintLevelOne") : null;
    }
    if (levelIndex === 1) {
      return isTutorialHintVisible ? t("game.hintLevelTwo") : null;
    }
    if (!isHintVisible) return null;
    if (!lastHint) return null;
    return t("game.hintAroundCell", {
      x: lastHint.x,
      y: lastHint.y,
    });
  }, [isHintVisible, isTutorialHintVisible, lastHint, levelIndex, t]);

  return {
    handleHint,
    levelHintMessage,
  };
};
