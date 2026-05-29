import { STAGE_THEME_COLORS, stageThemeKey } from "@/theme/colors";
import type {
  BaseGameResultScreenProps,
  GameFailureScreenProps,
  GameSuccessScreenProps,
} from "@/types/game-result-screen";
import type {
  GameResultContent,
  GameResultContentMap,
  GameResultVariant,
} from "@/types/result-content";
import type { StageId, StageThemeKey } from "@/types/stage-theme";
import { getCloudFrontAssetUrl } from "@/utils/asset-utils";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./game-result-screen.css";

const STAGE_ENDING_OVERLAYS: Record<StageThemeKey, string> = {
  "1": getCloudFrontAssetUrl("stage-1/stage-1-ending.png"),
  "2": getCloudFrontAssetUrl("stage-2/stage-2-ending.png"),
  "3": getCloudFrontAssetUrl("stage-3/stage-3-ending.png"),
  "4": getCloudFrontAssetUrl("stage-4/stage-4-ending.png"),
  "5": getCloudFrontAssetUrl("stage-5/stage-5-ending.png"),
  "6": getCloudFrontAssetUrl("stage-6/stage-6-ending.png"),
  "7": getCloudFrontAssetUrl("stage-7/stage-7-ending.png"),
};

const STAGE_SECONDARY_OVERLAYS: Record<StageThemeKey, string> = {
  "1": getCloudFrontAssetUrl("end_overlay.png"),
  "2": getCloudFrontAssetUrl("end_overlay.png"),
  "3": getCloudFrontAssetUrl("end_overlay.png"),
  "4": getCloudFrontAssetUrl("end_overlay2.png"),
  "5": getCloudFrontAssetUrl("end_overlay5.png"),
  "6": getCloudFrontAssetUrl("end_overlay6.png"),
  "7": getCloudFrontAssetUrl("end_overlay7.png"),
};

const STAGE_SUCCESS_ICONS: Record<StageThemeKey, string> = {
  "1": "/assets/icons/stage-1/star.svg",
  "2": "/assets/icons/stage-2/star.svg",
  "3": "/assets/icons/stage-3/star.svg",
  "4": "/assets/icons/stage-4/star.svg",
  "5": "/assets/icons/stage-5/star.png",
  "6": "/assets/icons/stage-6/star.png",
  "7": "/assets/icons/stage-7/star.png",
};

const STAGE_FAILURE_ICONS: Record<StageThemeKey, string> = {
  "1": "/assets/icons/stage-1/running.svg",
  "2": "/assets/icons/stage-2/running.svg",
  "3": "/assets/icons/stage-3/running.svg",
  "4": "/assets/icons/stage-4/running.svg",
  "5": "/assets/icons/stage-5/running.png",
  "6": "/assets/icons/stage-6/running.png",
  "7": "/assets/icons/stage-7/running.png",
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
  const themeKey = stageThemeKey(stage);
  const theme = STAGE_THEME_COLORS[themeKey];
  const topOverlay = STAGE_ENDING_OVERLAYS[themeKey];
  const lowerOverlay = STAGE_SECONDARY_OVERLAYS[themeKey];
  const resultAccentColor = theme.resultAccent;
  const chipIcon =
    variant === "success"
      ? STAGE_SUCCESS_ICONS[themeKey]
      : STAGE_FAILURE_ICONS[themeKey];
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
        aria-label="Game result screen"
      >
        <div
          className="resultEclipse"
          style={{ "--result-eclipse-color": theme.eclipse } as CSSProperties}
        />
        <Image
          src={topOverlay}
          alt=""
          aria-hidden
          className="resultTopOverlay"
          width={390}
          height={270}
          sizes="100vw"
          unoptimized
        />
        <Image
          src={lowerOverlay}
          alt=""
          aria-hidden
          className="resultBottomOverlay"
          width={418}
          height={279}
          sizes="100vw"
          unoptimized
        />

        <div className="resultContent">
          <div className="resultScoreBlock">
            <span className="resultScoreLabel">{content.scoreLabel}</span>
            <strong className="resultScoreValue">{score}</strong>
          </div>

          <div className="resultChip" data-variant={variant}>
            <span className="resultChipIcon" aria-hidden>
              <Image
                src={chipIcon}
                alt=""
                width={24}
                height={24}
                className="resultChipIconImage"
                unoptimized
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

          <section className="resultProgressCard" aria-label="Progress summary">
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
            disabled={!onContinue}
            aria-disabled={!onContinue}
            onClick={() => {
              onContinue?.(stage);
            }}
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
