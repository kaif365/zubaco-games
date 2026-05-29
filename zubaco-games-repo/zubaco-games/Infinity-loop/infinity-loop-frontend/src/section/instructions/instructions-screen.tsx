import { STAGE_THEME_COLORS, stageThemeKey } from "@/theme/colors";
import type { GameInstructionsScreenProps } from "@/types/game-instructions-screen";
import type {
  InstructionPoint,
  InstructionPointType,
  StageInstructionContent,
  StageInstructionContentMap,
} from "@/types/instruction-content";
import type { StageId, StageThemeKey } from "@/types/stage-theme";
import { getCloudFrontAssetUrl } from "@/utils/asset-utils";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import "./instructions-screen.css";

const STAGE_OVERLAYS: Record<StageThemeKey, string> = {
  "1": getCloudFrontAssetUrl("stage-1/Stage_1.png"),
  "2": getCloudFrontAssetUrl("stage-2/Stage_2.png"),
  "3": getCloudFrontAssetUrl("stage-3/Stage_3.png"),
  "4": getCloudFrontAssetUrl("stage-4/Stage_4.png"),
  "5": getCloudFrontAssetUrl("stage-5/Stage_5.png"),
  "6": getCloudFrontAssetUrl("stage-6/Stage_6.png"),
  "7": getCloudFrontAssetUrl("stage-7/Stage_7.png"),
};

/** When CMS does not supply a label, never substitute env/uuid stage ids into i18n templates. */
const resolveGameLabel = (labelTemplate: string): string =>
  labelTemplate.includes("{stage}")
    ? labelTemplate.replace("{stage}", "1")
    : labelTemplate;

/** Locale bundles only ship `instructions.stages` for a small set; other stage ids need copy fallbacks. */
const INSTRUCTION_I18N_FALLBACK_STAGE = "1";

function parseInstructionBucket(
  i18n: ReturnType<typeof useTranslation>["i18n"],
  stageKey: string,
): StageInstructionContent {
  const raw = i18n.t(`instructions.stages.${stageKey}`, {
    returnObjects: true,
  });
  const parsed =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Partial<StageInstructionContent>)
      : {};
  return {
    gameLabel: parsed.gameLabel ?? "",
    statusLabel: parsed.statusLabel ?? "",
    gameTitle: parsed.gameTitle ?? "",
    pages: Array.isArray(parsed.pages) ? parsed.pages : [],
    playNowButton: parsed.playNowButton ?? "",
    learnHowToPlay: parsed.learnHowToPlay ?? "",
    ...(parsed.language === undefined ? {} : { language: parsed.language }),
    ...(parsed.headerTagline === undefined
      ? {}
      : { headerTagline: parsed.headerTagline }),
  };
}

function mergeInstructionI18nWithFallback(
  fallback: StageInstructionContent,
  primary: StageInstructionContent,
): StageInstructionContent {
  const pick = (fromFallback: string, fromPrimary: string) =>
    fromPrimary.trim() ? fromPrimary : fromFallback;
  return {
    gameLabel: pick(fallback.gameLabel, primary.gameLabel),
    statusLabel: pick(fallback.statusLabel, primary.statusLabel),
    gameTitle: pick(fallback.gameTitle, primary.gameTitle),
    playNowButton: pick(fallback.playNowButton, primary.playNowButton),
    learnHowToPlay: pick(fallback.learnHowToPlay, primary.learnHowToPlay),
    pages: primary.pages.length > 0 ? primary.pages : fallback.pages,
    language: primary.language ?? fallback.language,
    headerTagline: primary.headerTagline ?? fallback.headerTagline,
  };
}

const getStageContent = (
  stage: StageId,
  i18n: ReturnType<typeof useTranslation>["i18n"],
  override?: Partial<StageInstructionContentMap>,
): StageInstructionContent => {
  const stageKey = String(stage);
  const primary = parseInstructionBucket(i18n, stageKey);
  const base =
    stageKey === INSTRUCTION_I18N_FALLBACK_STAGE
      ? primary
      : mergeInstructionI18nWithFallback(
          parseInstructionBucket(i18n, INSTRUCTION_I18N_FALLBACK_STAGE),
          primary,
        );

  const overrideContent = override?.[stage];
  if (!overrideContent) return base;

  const overridePages = overrideContent.pages;
  const merged: StageInstructionContent = {
    ...base,
    ...overrideContent,
    pages: Array.isArray(overridePages) ? overridePages : base.pages,
  };

  const coalesce = (fromMerged: string, fromBase: string) =>
    fromMerged.trim() ? fromMerged : fromBase;

  return {
    ...merged,
    gameLabel: coalesce(merged.gameLabel, base.gameLabel),
    statusLabel: coalesce(merged.statusLabel, base.statusLabel),
    gameTitle: coalesce(merged.gameTitle, base.gameTitle),
    playNowButton: coalesce(merged.playNowButton, base.playNowButton),
    learnHowToPlay: coalesce(merged.learnHowToPlay, base.learnHowToPlay),
  };
};

interface InstructionStepListProps {
  readonly points: InstructionPoint[];
  readonly pointType: InstructionPointType;
}

function InstructionStepList({
  points,
  pointType,
}: Readonly<InstructionStepListProps>) {
  const listRef = useRef<HTMLOListElement | null>(null);
  const badgeRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [connectorSegments, setConnectorSegments] = useState<
    Array<{ top: number; height: number }>
  >([]);

  const isUnordered = pointType === "UNORDERED";

  useLayoutEffect(() => {
    const measureConnectors = () => {
      const listEl = listRef.current;
      if (!listEl) {
        setConnectorSegments([]);
        return;
      }

      const listRect = listEl.getBoundingClientRect();
      const segments: Array<{ top: number; height: number }> = [];

      for (let index = 0; index < points.length - 1; index += 1) {
        const currentBadge = badgeRefs.current[index];
        const nextBadge = badgeRefs.current[index + 1];
        if (!currentBadge || !nextBadge) {
          continue;
        }
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
    if (listRef.current) {
      resizeObserver.observe(listRef.current);
    }
    badgeRefs.current.forEach((badge) => {
      if (badge) {
        resizeObserver.observe(badge);
      }
    });
    globalThis.window.addEventListener("resize", measureConnectors);

    return () => {
      resizeObserver.disconnect();
      globalThis.window.removeEventListener("resize", measureConnectors);
    };
  }, [points]);

  return (
    <ol className="list" ref={listRef}>
      {connectorSegments.map((segment, index) => (
        <span
          key={`${points[index]?.id ?? index}-connector`}
          className="connector"
          aria-hidden
          style={{ top: `${segment.top}px`, height: `${segment.height}px` }}
        />
      ))}
      {points.map((point, index) => (
        <li className="item" key={point.id ?? `point-${index}`}>
          <span
            className={`badge ${isUnordered ? "ruleBadge" : ""}`}
            ref={(element) => {
              badgeRefs.current[index] = element;
            }}
          >
            {isUnordered ? "×" : index + 1}
          </span>
          <div className="itemContent">
            <p className={`itemTitle ${isUnordered ? "ruleTitle" : ""}`}>
              {point.title}
            </p>
            {point.description ? (
              <p className="itemDescription">{point.description}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function GameInstructionsScreen({
  stage,
  contentByStage,
  onPlayNow,
  onLearnHowToPlay,
  isPlayNowLoading = false,
  isLearnHowToPlayLoading = false,
  hideLearnHowToPlay = false,
  hidePlayNow = false,
  className,
}: Readonly<GameInstructionsScreenProps>) {
  const { i18n, t } = useTranslation();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
  });
  const [currentSlide, setCurrentSlide] = useState(0);
  const themeKey = stageThemeKey(stage);
  const theme = STAGE_THEME_COLORS[themeKey];
  const overlay = STAGE_OVERLAYS[themeKey];
  const content = useMemo(
    () => getStageContent(stage, i18n, contentByStage),
    [contentByStage, i18n, stage],
  );

  const descriptionRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const [descriptionHeights, setDescriptionHeights] = useState<number[]>([]);

  useLayoutEffect(() => {
    const heights = descriptionRefs.current.map((el) => el?.offsetHeight ?? 0);
    setDescriptionHeights(heights);
  }, [content.pages, currentSlide]);

  const ctaBusy = isPlayNowLoading || isLearnHowToPlayLoading;

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentSlide(emblaApi.selectedScrollSnap());
    emblaApi.scrollTo(0);
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, stage, content.pages.length]);

  const onDotClick = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  return (
    <div className="instructionViewport">
      <section
        className={`${className ?? ""} instructionRoot`.trim()}
        style={
          {
            backgroundColor: theme.background,
            "--eclipse-color": theme.eclipse,
            "--scrollbar-thumb-color": theme.eclipse,
            "--scrollbar-thumb-hover-color": theme.eclipse,
            "--scrollbar-track-color": "rgba(255, 255, 255, 0.06)",
          } as React.CSSProperties
        }
        aria-label="Game instructions screen"
      >
        <Image
          src={overlay}
          alt=""
          aria-hidden
          className="overlay"
          fill
          sizes="100vw"
          loading="eager"
          unoptimized
        />
        <div
          className="eclipse"
          style={{ "--eclipse-color": theme.eclipse } as React.CSSProperties}
        />

        <div className="content">
          <div className="metaRow">
            <span className="metaText">
              {resolveGameLabel(content.gameLabel)}
            </span>
            <span className="statusPill">{content.statusLabel}</span>
          </div>
          <h1 className="gameTitle">{content.gameTitle}</h1>

          <div className="carouselSection">
            <div className="viewport" ref={emblaRef}>
              <div className="slideContainer">
                {content.pages.map((page, slideIndex) => (
                  <article
                    className={`slide ${
                      slideIndex === currentSlide
                        ? "slideActive"
                        : "slidePeeked"
                    }`}
                    key={page.id ?? `page-${slideIndex}`}
                  >
                    <div className="card">
                      <div className="card-header">
                        <h2
                          className={`cardTitle ${
                            slideIndex === content.pages.length - 1
                              ? "cardTitleLast"
                              : ""
                          }`}
                        >
                          {page.title}
                        </h2>
                        <p
                          className="cardDescription"
                          ref={(el) => {
                            descriptionRefs.current[slideIndex] = el;
                          }}
                        >
                          {page.description}
                        </p>
                      </div>
                      <div
                        className="listing-points mb-0 md:mb-0"
                        style={{
                          maxHeight: `calc(87% - ${descriptionHeights[slideIndex] ?? 0}px)`,
                        }}
                      >
                        <InstructionStepList
                          points={page.points}
                          pointType={page.pointType}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="dots" aria-label="Instruction slide indicators">
              {content.pages.map((page, index) => (
                <button
                  key={page.id ?? `dot-${index}`}
                  type="button"
                  aria-label={`Go to ${page.title}`}
                  aria-current={index === currentSlide ? "true" : "false"}
                  onClick={() => onDotClick(index)}
                  className={`dot ${index === currentSlide ? "dotActive" : ""}`.trim()}
                />
              ))}
            </div>
          </div>

          <div className="ctaStack">
            {hidePlayNow ? null : (
              <button
                className={`button buttonPrimary ${isPlayNowLoading ? "buttonLoading" : ""}`.trim()}
                type="button"
                disabled={ctaBusy}
                aria-busy={isPlayNowLoading}
                onClick={() => onPlayNow?.(stage)}
              >
                {isPlayNowLoading ? t("common.loading") : content.playNowButton}
              </button>
            )}
            {!hideLearnHowToPlay && (
              <button
                className={`button buttonSecondary ${isLearnHowToPlayLoading ? "buttonLoading" : ""}`.trim()}
                type="button"
                disabled={ctaBusy}
                aria-busy={isLearnHowToPlayLoading}
                onClick={() => onLearnHowToPlay?.(stage)}
              >
                {isLearnHowToPlayLoading
                  ? t("common.loading")
                  : content.learnHowToPlay}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
