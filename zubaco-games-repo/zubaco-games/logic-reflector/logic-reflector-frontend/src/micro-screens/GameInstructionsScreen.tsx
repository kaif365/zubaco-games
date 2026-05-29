import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { GameInstructionsScreenProps } from './types/game-instructions-screen';
import type { StageInstructionContent } from './types/instruction-content';
import type { StageId } from './types/stage-theme';
import { STAGE_THEME_COLORS } from './theme/colors';
import { INSTRUCTION_SCREEN_CONTENT_MAP } from './instruction-screen-content-map';
import { getCloudFrontAssetUrl } from '@/utils/asset-utils';
import './instructions-screen.css';

// ─── Stage overlay images ───────────────────────────────────────────────────

const STAGE_OVERLAYS: Record<StageId, string> = {
  1: getCloudFrontAssetUrl('stage-1/Stage_1.png'),
  2: getCloudFrontAssetUrl('stage-2/Stage_2.png'),
  3: getCloudFrontAssetUrl('stage-3/Stage_3.png'),
  4: getCloudFrontAssetUrl('stage-4/Stage_4.png'),
  5: getCloudFrontAssetUrl('stage-5/Stage_5.png'),
  6: getCloudFrontAssetUrl('stage-6/Stage_6.png'),
  7: getCloudFrontAssetUrl('stage-7/Stage_7.png'),
};

const resolveGameLabel = (labelTemplate: string, stage: StageId): string =>
  labelTemplate.includes('{stage}')
    ? labelTemplate.replace('{stage}', String(stage))
    : labelTemplate;

// ─── InstructionStepList ────────────────────────────────────────────────────

type SlideItem = StageInstructionContent['slides'][number]['items'][number];

type InstructionStepListProps = {
  readonly items: SlideItem[];
};

function InstructionStepList({ items }: InstructionStepListProps) {
  const listRef = useRef<HTMLOListElement | null>(null);
  const badgeRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [connectorSegments, setConnectorSegments] = useState<
    Array<{ top: number; height: number }>
  >([]);

  useLayoutEffect(() => {
    const measureConnectors = () => {
      const listEl = listRef.current;
      if (!listEl) {
        setConnectorSegments([]);
        return;
      }

      const listRect = listEl.getBoundingClientRect();
      const segments: Array<{ top: number; height: number }> = [];

      for (let index = 0; index < items.length - 1; index += 1) {
        const currentBadge = badgeRefs.current[index];
        const nextBadge = badgeRefs.current[index + 1];
        if (!currentBadge || !nextBadge) continue;

        const currentRect = currentBadge.getBoundingClientRect();
        const nextRect = nextBadge.getBoundingClientRect();
        const top = currentRect.bottom - listRect.top + 2;
        const height = Math.max(nextRect.top - currentRect.bottom - 4, 0);
        segments.push({ top, height });
      }

      setConnectorSegments(segments);
    };

    measureConnectors();

    const resizeObserver = new ResizeObserver(measureConnectors);
    if (listRef.current) resizeObserver.observe(listRef.current);
    badgeRefs.current.forEach((badge) => {
      if (badge) resizeObserver.observe(badge);
    });
    globalThis.window.addEventListener('resize', measureConnectors);

    return () => {
      resizeObserver.disconnect();
      globalThis.window.removeEventListener('resize', measureConnectors);
    };
  }, [items]);

  return (
    <ol className="list relative" ref={listRef}>
      {connectorSegments.map((segment, index) => (
        <span
          key={`${items[index]?.id ?? index}-connector`}
          className="connector"
          aria-hidden
          style={{ top: `${segment.top}px`, height: `${segment.height}px` }}
        />
      ))}
      {items.map((item, index) => {
        const isRule = item.variant === 'rule';
        return (
          <li className={`item ${isRule ? 'items-center' : ''}`} key={item.id}>
            <span
              className={`badge ${isRule ? 'ruleBadge' : ''}`}
              ref={(el) => {
                badgeRefs.current[index] = el;
              }}
            >
              {isRule ? '×' : index + 1}
            </span>
            <div className="itemContent">
              <p className={`itemTitle ${isRule ? 'ruleTitle' : ''}`}>{item.title}</p>
              {item.description ? <p className="itemDescription">{item.description}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── GameInstructionsScreen ─────────────────────────────────────────────────

export function GameInstructionsScreen({
  stage,
  contentByStage,
  onPlayNow,
  isPlayNowLoading = false,
  onLearnHowToPlay,
  hideLearnHowToPlay = false,
  className,
}: Readonly<GameInstructionsScreenProps>) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'center' });
  const [currentSlide, setCurrentSlide] = useState(0);
  const { i18n, t } = useTranslation();
  const theme = STAGE_THEME_COLORS[stage];
  const overlay = STAGE_OVERLAYS[stage];

  const content = useMemo(() => {
    const i18nRaw = i18n.t('instructions.stageInstructions', { returnObjects: true });
    const i18nContent =
      typeof i18nRaw !== 'string' ? (i18nRaw as Partial<StageInstructionContent>) : undefined;
    const base = {
      ...INSTRUCTION_SCREEN_CONTENT_MAP[stage],
      ...(i18nContent ?? {}),
    };
    const overrideContent = contentByStage?.[stage];
    if (!overrideContent) return base;
    return {
      ...base,
      ...overrideContent,
      slides: overrideContent.slides,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentByStage, stage, i18n.language]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setCurrentSlide(emblaApi.selectedScrollSnap());
    };
    emblaApi.scrollTo(0);
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, stage]);

  const onDotClick = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi],
  );

  return (
    <div className="instructionViewport">
      <section
        className={`${className ?? ''} instructionRoot`.trim()}
        style={{ backgroundColor: theme.background }}
        aria-label="Game instructions screen"
      >
        <img src={overlay} alt="" aria-hidden className="overlay" />
        <div
          className="eclipse"
          style={{ '--eclipse-color': theme.eclipse } as React.CSSProperties}
        />

        <div className="content">
          <div className="metaRow">
            <span className="metaText">{resolveGameLabel(content.gameLabel, stage)}</span>
            <span className="statusPill">{content.statusLabel}</span>
          </div>
          <h1 className="gameTitle">{content.gameTitle}</h1>

          <div className="carouselSection">
            <div className="viewport" ref={emblaRef}>
              <div className="slideContainer">
                {content.slides.map((slide, slideIndex) => (
                  <article
                    className={`slide ${
                      slideIndex === currentSlide ? 'slideActive' : 'slidePeeked'
                    }`}
                    key={slide.id}
                  >
                    <div className="card">
                      <h2
                        className={`cardTitle ${
                          slideIndex === content.slides.length - 1 ? 'cardTitleLast' : ''
                        }`}
                      >
                        {slide.title}
                      </h2>
                      <p className="cardDescription">{slide.description}</p>
                      <div className="listing-points">
                        <InstructionStepList items={slide.items} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="dots" aria-label="Instruction slide indicators">
              {content.slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Go to ${slide.title}`}
                  aria-current={index === currentSlide ? 'true' : 'false'}
                  onClick={() => {
                    onDotClick(index);
                  }}
                  className={`dot ${index === currentSlide ? 'dotActive' : ''}`.trim()}
                />
              ))}
            </div>
          </div>

          <div className="ctaStack">
            <button
              className={`button buttonPrimary${isPlayNowLoading ? ' buttonLoading' : ''}`}
              type="button"
              disabled={isPlayNowLoading}
              onClick={() => onPlayNow?.(stage)}
            >
              {isPlayNowLoading ? (
                <span className="buttonLoadingContent">
                  <span className="buttonSpinner" aria-hidden="true" />
                </span>
              ) : (
                content.playNowButton ?? t('instructions.labels.playNow')
              )}
            </button>
            {!hideLearnHowToPlay && (
              <button
                className="button buttonSecondary"
                type="button"
                onClick={() => onLearnHowToPlay?.(stage)}
              >
                {content.learnHowToPlay ?? t('instructions.labels.learnHowToPlay')}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
