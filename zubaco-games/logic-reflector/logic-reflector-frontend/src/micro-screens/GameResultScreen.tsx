import { useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  BaseGameResultScreenProps,
  GameFailureScreenProps,
  GameSuccessScreenProps,
} from './types/game-result-screen';
import type {
  GameResultContent,
  GameResultContentMap,
  GameResultVariant,
} from './types/result-content';
import type { StageId } from './types/stage-theme';
import { STAGE_THEME_COLORS } from './theme/colors';
import {
  DEFAULT_FAILURE_STAGE_RESULT_CONTENT,
  DEFAULT_SUCCESS_STAGE_RESULT_CONTENT,
} from './result-screen-content-map';
import { getCloudFrontAssetUrl } from '@/utils/asset-utils';
import './game-result-screen.css';

// ─── Stage overlay images ───────────────────────────────────────────────────

const STAGE_ENDING_OVERLAYS: Record<StageId, string> = {
  1: getCloudFrontAssetUrl('stage-1/stage-1-ending.png'),
  2: getCloudFrontAssetUrl('stage-2/stage-2-ending.png'),
  3: getCloudFrontAssetUrl('stage-3/stage-3-ending.png'),
  4: getCloudFrontAssetUrl('stage-4/stage-4-ending.png'),
  5: getCloudFrontAssetUrl('stage-5/stage-5-ending.png'),
  6: getCloudFrontAssetUrl('stage-6/stage-6-ending.png'),
  7: getCloudFrontAssetUrl('stage-7/stage-7-ending.png'),
};

const STAGE_SECONDARY_OVERLAYS: Record<StageId, string> = {
  1: getCloudFrontAssetUrl('end_overlay.png'),
  2: getCloudFrontAssetUrl('end_overlay.png'),
  3: getCloudFrontAssetUrl('end_overlay.png'),
  4: getCloudFrontAssetUrl('end_overlay2.png'),
  5: getCloudFrontAssetUrl('end_overlay5.png'),
  6: getCloudFrontAssetUrl('end_overlay6.png'),
  7: getCloudFrontAssetUrl('end_overlay7.png'),
};

// ─── Chip icons ─────────────────────────────────────────────────────────────

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function TargetMissIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const clampProgress = (value: number): number =>
  Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 0;

const resolveContent = (
  stage: StageId,
  variant: GameResultVariant,
  override?: Partial<GameResultContentMap>,
): GameResultContent => {
  const defaults =
    variant === 'success'
      ? DEFAULT_SUCCESS_STAGE_RESULT_CONTENT
      : DEFAULT_FAILURE_STAGE_RESULT_CONTENT;
  return { ...defaults[stage], ...override?.[stage] };
};

// ─── GameResultScreen ─────────────────────────────────────────────────────────

function GameResultScreen({
  stage,
  score,
  completedGames,
  totalGames,
  variant,
  isTimeUp = false,
  contentByStage,
  onContinue,
  className,
}: Readonly<BaseGameResultScreenProps>) {
  const { t } = useTranslation();
  const theme = STAGE_THEME_COLORS[stage];
  const topOverlay = STAGE_ENDING_OVERLAYS[stage];
  const lowerOverlay = STAGE_SECONDARY_OVERLAYS[stage];
  const resultAccentColor = theme.resultAccent;

  const i18nVariant = isTimeUp ? 'timeUp' : variant;

  const content = useMemo(() => {
    const staticContent = resolveContent(stage, variant, contentByStage);
    const i18nContent: GameResultContent = {
      scoreLabel: t(`results.${i18nVariant}.scoreLabel`),
      chipLabel: t(`results.${i18nVariant}.chipLabel`),
      headingLeading: t(`results.${i18nVariant}.headingLeading`),
      headingHighlight: t(`results.${i18nVariant}.headingHighlight`),
      headingTrailing: t(`results.${i18nVariant}.headingTrailing`),
      subheading: t(`results.${i18nVariant}.subheading`),
      progressLabel: t(`results.${i18nVariant}.progressLabel`),
      progressSuffixLabel: t(`results.${i18nVariant}.progressSuffixLabel`),
      ctaLabel: t(`results.${i18nVariant}.ctaLabel`),
    };
    return { ...staticContent, ...i18nContent };
  }, [contentByStage, stage, variant, i18nVariant, t]);

  const normalizedTotal = Math.max(totalGames, 1);
  const normalizedCompleted = Math.min(Math.max(completedGames, 0), normalizedTotal);
  const progressPercent = clampProgress((normalizedCompleted / normalizedTotal) * 100);
  const progressRatio = progressPercent / 100;
  const ringRadius = 30;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - progressRatio);

  return (
    <div className="resultViewport">
      <section
        className={`${className ?? ''} resultRoot`.trim()}
        style={
          {
            backgroundColor: theme.background,
            '--result-accent-color': resultAccentColor,
          } as CSSProperties
        }
        aria-label="Game result screen"
      >
        <div
          className="resultEclipse"
          style={{ '--result-eclipse-color': theme.eclipse } as CSSProperties}
        />
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

        <div className="resultContent">
          <div className="resultScoreBlock">
            <span className="resultScoreLabel">{content.scoreLabel}</span>
            <strong className="resultScoreValue">{score.toLocaleString()}</strong>
          </div>

          <div className="resultChip" data-variant={variant}>
            <span className="resultChipIcon" aria-hidden>
              {variant === 'success' ? <StarIcon /> : <TargetMissIcon />}
            </span>
            <span>{content.chipLabel}</span>
          </div>

          <article className="resultMessageCard">
            <h1 className="resultHeading">
              <span>{content.headingLeading}</span>
              <span className="resultHeadingHighlight">{content.headingHighlight}</span>
              <span>{content.headingTrailing}</span>
            </h1>
            <p className="resultSubheading">{content.subheading}</p>
          </article>

          <section className="resultProgressCard" aria-label="Progress summary">
            <div className="resultProgressLeft">
              <span className="resultProgressLabel">{content.progressLabel}</span>
              <p className="resultProgressValue">
                <strong>
                  {normalizedCompleted}/{normalizedTotal}
                </strong>{' '}
                {content.progressSuffixLabel}
              </p>
            </div>
            <div
              className="resultProgressRing"
              style={
                {
                  '--progress-ring-dasharray': String(ringCircumference),
                  '--progress-ring-dashoffset': String(ringDashOffset),
                } as CSSProperties
              }
            >
              <svg className="resultProgressRingSvg" viewBox="0 0 64 64" aria-hidden>
                <circle className="resultProgressRingTrack" cx="32" cy="32" r="30" />
                <circle className="resultProgressRingArc" cx="32" cy="32" r="30" />
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
