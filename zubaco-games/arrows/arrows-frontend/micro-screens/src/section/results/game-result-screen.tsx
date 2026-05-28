import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import stage1RunningIcon from "@micro-screens/assets/icons/stage-1/running.svg";
import stage1StarIcon from "@micro-screens/assets/icons/stage-1/star.svg";
import stage2RunningIcon from "@micro-screens/assets/icons/stage-2/running.svg";
import stage2StarIcon from "@micro-screens/assets/icons/stage-2/star.svg";
import stage3RunningIcon from "@micro-screens/assets/icons/stage-3/running.svg";
import stage3StarIcon from "@micro-screens/assets/icons/stage-3/star.svg";
import stage4RunningIcon from "@micro-screens/assets/icons/stage-4/running.svg";
import stage4StarIcon from "@micro-screens/assets/icons/stage-4/star.svg";
import stage5RunningIcon from "@micro-screens/assets/icons/stage-5/running.png";
import stage5StarIcon from "@micro-screens/assets/icons/stage-5/star.png";
import stage6RunningIcon from "@micro-screens/assets/icons/stage-6/running.png";
import stage6StarIcon from "@micro-screens/assets/icons/stage-6/star.png";
import stage7RunningIcon from "@micro-screens/assets/icons/stage-7/running.png";
import stage7StarIcon from "@micro-screens/assets/icons/stage-7/star.png";
import { getCloudFrontAssetUrl } from "@utils/asset-utils";
import type {
  BaseGameResultScreenProps,
  GameFailureScreenProps,
  GameSuccessScreenProps,
} from "@micro-screens/src/types/game-result-screen";
import type {
  GameResultContent,
  GameResultContentMap,
  GameResultVariant,
} from "@micro-screens/src/types/result-content";
import type { StageId } from "@micro-screens/src/types/stage-theme";
import { STAGE_THEME_COLORS } from "@micro-screens/theme/colors";

import "./game-result-screen.css";

const STAGE_ENDING_OVERLAYS: Record<StageId, string> = {
  1: getCloudFrontAssetUrl("stage-1/stage-1-ending.png"),
  2: getCloudFrontAssetUrl("stage-2/stage-2-ending.png"),
  3: getCloudFrontAssetUrl("stage-3/stage-3-ending.png"),
  4: getCloudFrontAssetUrl("stage-4/stage-4-ending.png"),
  5: getCloudFrontAssetUrl("stage-5/stage-5-ending.png"),
  6: getCloudFrontAssetUrl("stage-6/stage-6-ending.png"),
  7: getCloudFrontAssetUrl("stage-7/stage-7-ending.png"),
};

const STAGE_SECONDARY_OVERLAYS: Record<StageId, string> = {
  1: getCloudFrontAssetUrl("end_overlay.png"),
  2: getCloudFrontAssetUrl("end_overlay.png"),
  3: getCloudFrontAssetUrl("end_overlay.png"),
  4: getCloudFrontAssetUrl("end_overlay2.png"),
  5: getCloudFrontAssetUrl("end_overlay5.png"),
  6: getCloudFrontAssetUrl("end_overlay6.png"),
  7: getCloudFrontAssetUrl("end_overlay7.png"),
};

const STAGE_SUCCESS_ICONS: Record<StageId, string> = {
  1: stage1StarIcon,
  2: stage2StarIcon,
  3: stage3StarIcon,
  4: stage4StarIcon,
  5: stage5StarIcon,
  6: stage6StarIcon,
  7: stage7StarIcon,
};

const STAGE_FAILURE_ICONS: Record<StageId, string> = {
  1: stage1RunningIcon,
  2: stage2RunningIcon,
  3: stage3RunningIcon,
  4: stage4RunningIcon,
  5: stage5RunningIcon,
  6: stage6RunningIcon,
  7: stage7RunningIcon,
};

const clampProgress = (value: number): number =>
  Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 0;

const resolveContent = (
  i18n: ReturnType<typeof useTranslation>["i18n"],
  stage: StageId,
  variant: GameResultVariant,
  override?: Partial<GameResultContentMap>,
): GameResultContent => {
  const defaults = i18n.t(`results.${variant}`, {
    returnObjects: true,
  }) as GameResultContent;
  return {
    ...defaults,
    ...override?.[stage],
  };
};

function GameResultScreen({
  stage,
  score,
  completedGames,
  totalGames,
  variant,
  contentByStage,
  onContinue,
  className,
}: Readonly<BaseGameResultScreenProps>) {
  const { i18n } = useTranslation();
  const theme = STAGE_THEME_COLORS[stage];
  const topOverlay = STAGE_ENDING_OVERLAYS[stage];
  const lowerOverlay = STAGE_SECONDARY_OVERLAYS[stage];
  const resultAccentColor = theme.resultAccent;
  const chipIcon =
    variant === "success"
      ? STAGE_SUCCESS_ICONS[stage]
      : STAGE_FAILURE_ICONS[stage];
  const content = useMemo(
    () => resolveContent(i18n, stage, variant, contentByStage),
    [contentByStage, i18n, stage, variant],
  );

  const normalizedTotal = Math.max(totalGames, 1);
  const normalizedCompleted = Math.min(
    Math.max(completedGames, 0),
    normalizedTotal,
  );
  const progressPercent = clampProgress(
    (normalizedCompleted / normalizedTotal) * 100,
  );
  const progressRatio = progressPercent / 100;
  const ringRadius = 30;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - progressRatio);

  return (
    <div className="resultViewport">
      <section
        className={`${className ?? ""} resultRoot`.trim()}
        style={
          {
            backgroundColor: theme.background,
            "--result-accent-color": resultAccentColor,
          } as CSSProperties
        }
        aria-label={i18n.t("results.aria.screen")}
      >
        <div
          className="resultEclipse"
          style={{ "--result-eclipse-color": theme.eclipse } as CSSProperties}
        />
        <div className="result-assets">
          <img
            src={topOverlay}
            alt=""
            aria-hidden
            className="resultTopOverlay"
            width={390}
            height={270}
          />
          <img
            src={lowerOverlay}
            alt=""
            aria-hidden
            className="resultBottomOverlay"
            width={418}
            height={279}
          />
        </div>

        <div className="resultContent">
          <div className="resultScoreBlock">
            <span className="resultScoreLabel">{content.scoreLabel}</span>
            <strong className="resultScoreValue">{score}</strong>
          </div>

          <div className="resultChip" data-variant={variant}>
            <span className="resultChipIcon" aria-hidden>
              <img
                src={chipIcon}
                alt=""
                width={24}
                height={24}
                className="resultChipIconImage"
              />
            </span>
            <span>{content.chipLabel}</span>
          </div>

          <article className="resultMessageCard">
            <h1 className="resultHeading">
              <span>{content.headingLeading}</span>
              <span className="resultHeadingHighlight">
                {content.headingHighlight}
              </span>
              <span>{content.headingTrailing}</span>
            </h1>
            <p className="resultSubheading">{content.subheading}</p>
          </article>

          <section
            className="resultProgressCard"
            aria-label={i18n.t("results.aria.progress")}
          >
            <div className="resultProgressLeft">
              <span className="resultProgressLabel">
                {content.progressLabel}
              </span>
              <p className="resultProgressValue">
                <strong>
                  {normalizedCompleted}/{normalizedTotal}
                </strong>{" "}
                {content.progressSuffixLabel}
              </p>
            </div>
            <div
              className="resultProgressRing"
              style={
                {
                  "--progress-ring-dasharray": `${ringCircumference}`,
                  "--progress-ring-dashoffset": `${ringDashOffset}`,
                } as CSSProperties
              }
            >
              <svg
                className="resultProgressRingSvg"
                viewBox="0 0 64 64"
                aria-hidden
              >
                <circle
                  className="resultProgressRingTrack"
                  cx="32"
                  cy="32"
                  r="30"
                />
                <circle
                  className="resultProgressRingArc"
                  cx="32"
                  cy="32"
                  r="30"
                />
              </svg>
              <span>
                {normalizedCompleted}/{normalizedTotal}
              </span>
            </div>
          </section>

          <button
            className="resultContinueButton"
            type="button"
            onClick={() => onContinue?.(stage)}
          >
            {content.ctaLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function GameSuccessScreen(props: Readonly<GameSuccessScreenProps>) {
  return <GameResultScreen {...props} variant="success" />;
}

export function GameFailureScreen(props: Readonly<GameFailureScreenProps>) {
  return <GameResultScreen {...props} variant="failure" />;
}
