import { getCloudFrontAssetUrl } from "@/utils/asset-utils";
import { STAGE_THEME_COLORS, stageThemeKey } from "@/theme/colors";
import type { StageId, StageThemeKey } from "@/types/stage-theme";
import Image from "next/image";
import type { CSSProperties } from "react";
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

interface GameInstructionsSkeletonProps {
  readonly stage: StageId;
  readonly className?: string;
}

export function GameInstructionsSkeleton({
  stage,
  className,
}: Readonly<GameInstructionsSkeletonProps>) {
  const themeKey = stageThemeKey(stage);
  const theme = STAGE_THEME_COLORS[themeKey];
  const overlay = STAGE_OVERLAYS[themeKey];

  return (
    <div className="instructionViewport">
      <section
        className={`${className ?? ""} instructionRoot`.trim()}
        style={{ backgroundColor: theme.background }}
        aria-busy="true"
        aria-label="Loading instructions"
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
          style={{ "--eclipse-color": theme.eclipse } as CSSProperties}
        />

        <div className="content">
          <div className="metaRow">
            <span className="h-4 w-24 animate-pulse rounded-md bg-white/15" />
            <span className="h-5 w-16 animate-pulse rounded-full bg-white/15" />
          </div>

          <div className="mt-2 h-9 w-[min(90%,280px)] animate-pulse rounded-lg bg-white/12" />

          <div className="carouselSection mt-6">
            <div className="viewport">
              <div className="slideContainer">
                <div className="slide slideActive">
                  <div className="card pointer-events-none animate-pulse">
                    <div className="mx-auto h-6 w-[60%] rounded-md bg-white/15" />
                    <div className="mt-4 h-4 w-full rounded-md bg-white/10" />
                    <div className="mt-2 h-4 w-[92%] rounded-md bg-white/10" />
                    <div className="mt-8 space-y-3">
                      <div className="h-3 w-full rounded bg-white/10" />
                      <div className="h-3 w-[88%] rounded bg-white/10" />
                      <div className="h-3 w-[76%] rounded bg-white/10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="dots mt-4 flex justify-center gap-2">
              <span className="dot dotActive animate-pulse bg-white/25" />
              <span className="dot animate-pulse bg-white/12" />
              <span className="dot animate-pulse bg-white/12" />
            </div>
          </div>

          <div className="ctaStack mt-auto">
            <div className="h-[52px] w-full animate-pulse rounded-full bg-white/14" />
            <div className="h-[52px] w-full animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </section>
    </div>
  );
}
