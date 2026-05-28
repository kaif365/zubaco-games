import { FadeSlide } from '@/components/motion/fade-slide';
import { STAGE_THEME_COLORS } from '@/theme/stage-colors';
import type {
  BaseGameResultScreenProps,
  GameFailureScreenProps,
  GameSuccessScreenProps,
} from '@/types/game-result-screen';
import type {
  GameResultContent,
  GameResultContentMap,
  GameResultVariant,
  ResultScreenLabels,
} from '@/types/result-content';
import type { StageId } from '@/types/stage-theme';
import type { i18n as I18nInstance } from 'i18next';
import { motion, useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getCloudFrontAssetUrl } from '@/utils/asset-utils';

const stage1RunningIcon = '/assets/icons/stage-1/running.svg';
const stage1StarIcon = '/assets/icons/stage-1/star.svg';
const stage2RunningIcon = '/assets/icons/stage-2/running.svg';
const stage2StarIcon = '/assets/icons/stage-2/star.svg';
const stage3RunningIcon = '/assets/icons/stage-3/running.svg';
const stage3StarIcon = '/assets/icons/stage-3/star.svg';
const stage4RunningIcon = '/assets/icons/stage-4/running.svg';
const stage4StarIcon = '/assets/icons/stage-4/star.svg';
const stage5RunningIcon = '/assets/icons/stage-5/running.png';
const stage5StarIcon = '/assets/icons/stage-5/star.png';
const stage6RunningIcon = '/assets/icons/stage-6/running.png';
const stage6StarIcon = '/assets/icons/stage-6/star.png';
const stage7RunningIcon = '/assets/icons/stage-7/running.png';
const stage7StarIcon = '/assets/icons/stage-7/star.png';

import './game-result-screen.css';
import {
  DEFAULT_FAILURE_STAGE_RESULT_CONTENT,
  DEFAULT_SUCCESS_STAGE_RESULT_CONTENT,
} from './result-screen-content-map';

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

function parseResultLabels(i18n: I18nInstance, variant: GameResultVariant): ResultScreenLabels {
  const key = variant === 'success' ? 'results.success' : 'results.failure';
  const raw = i18n.t(key, { returnObjects: true });
  if (typeof raw === 'string') {
    return variant === 'success'
      ? DEFAULT_SUCCESS_STAGE_RESULT_CONTENT[1]
      : DEFAULT_FAILURE_STAGE_RESULT_CONTENT[1];
  }
  return raw as ResultScreenLabels;
}

const resolveContent = (
  i18n: I18nInstance,
  stage: StageId,
  variant: GameResultVariant,
  override?: Partial<GameResultContentMap>,
): GameResultContent => {
  const defaults =
    variant === 'success'
      ? DEFAULT_SUCCESS_STAGE_RESULT_CONTENT
      : DEFAULT_FAILURE_STAGE_RESULT_CONTENT;
  const i18nLabels = parseResultLabels(i18n, variant);
  return {
    ...defaults[stage],
    ...i18nLabels,
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
  isContinueDisabled = false,
  className,
}: Readonly<BaseGameResultScreenProps>) {
  const { i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const theme = STAGE_THEME_COLORS[stage];
  const topOverlay = STAGE_ENDING_OVERLAYS[stage];
  const lowerOverlay = STAGE_SECONDARY_OVERLAYS[stage];
  const resultAccentColor = theme.resultAccent;
  const chipIcon = variant === 'success' ? STAGE_SUCCESS_ICONS[stage] : STAGE_FAILURE_ICONS[stage];
  const content = useMemo(
    () => resolveContent(i18n, stage, variant, contentByStage),
    [contentByStage, i18n, stage, variant],
  );

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

        <FadeSlide className="resultContent">
          <motion.div
            className="resultScoreBlock"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.05 }}
          >
            <span className="resultScoreLabel">{content.scoreLabel}</span>
            <strong className="resultScoreValue">{score}</strong>
          </motion.div>

          <motion.div
            className="resultChip"
            data-variant={variant}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, delay: 0.1 }}
          >
            <span className="resultChipIcon" aria-hidden>
              <img src={chipIcon} alt="" width={24} height={24} className="resultChipIconImage" />
            </span>
            <span>{content.chipLabel}</span>
          </motion.div>

          <motion.article
            className="resultMessageCard"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.14 }}
          >
            <h1 className="resultHeading">
              <span>{content.headingLeading}</span>
              <span className="resultHeadingHighlight">{content.headingHighlight}</span>
              <span>{content.headingTrailing}</span>
            </h1>
            <p className="resultSubheading">{content.subheading}</p>
          </motion.article>

          <motion.section
            className="resultProgressCard"
            aria-label="Progress summary"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.18 }}
          >
            <div className="resultProgressLeft">
              <span className="resultProgressLabel">{content.progressLabel}</span>
              <p className="resultProgressValue">
                <strong>
                  {normalizedCompleted}/{normalizedTotal}
                </strong>{' '}
                {content.progressSuffixLabel}
              </p>
            </div>
            <motion.div
              className="resultProgressRing"
              style={
                {
                  '--progress-ring-dasharray': `${ringCircumference}`,
                  '--progress-ring-dashoffset': `${ringDashOffset}`,
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
            </motion.div>
          </motion.section>

          <motion.button
            className="resultContinueButton"
            type="button"
            disabled={!onContinue || isContinueDisabled}
            aria-disabled={!onContinue || isContinueDisabled}
            whileHover={reduceMotion ? undefined : { scale: 1.02 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.22 }}
            onClick={() => {
              onContinue?.(stage);
            }}
          >
            {content.ctaLabel}
          </motion.button>
        </FadeSlide>
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
