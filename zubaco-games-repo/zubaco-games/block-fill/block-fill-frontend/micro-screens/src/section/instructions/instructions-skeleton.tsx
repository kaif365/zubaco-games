import { getCloudFrontAssetUrl } from '@utils/asset-utils';
import type { StageId } from '@micro-screens/src/types/stage-theme';
import { STAGE_THEME_COLORS } from '@micro-screens/theme/colors';

import './instructions-screen.css';

const STAGE_OVERLAYS: Record<StageId, string> = {
  1: getCloudFrontAssetUrl('stage-1/Stage_1.png'),
  2: getCloudFrontAssetUrl('stage-2/Stage_2.png'),
  3: getCloudFrontAssetUrl('stage-3/Stage_3.png'),
  4: getCloudFrontAssetUrl('stage-4/Stage_4.png'),
  5: getCloudFrontAssetUrl('stage-5/Stage_5.png'),
  6: getCloudFrontAssetUrl('stage-6/Stage_6.png'),
  7: getCloudFrontAssetUrl('stage-7/Stage_7.png'),
};

const SHIMMER_DARK = 'rgba(255,255,255,0.10)';
const SHIMMER_MID = 'rgba(255,255,255,0.15)';
const SHIMMER_LIGHT = 'rgba(255,255,255,0.20)';

interface GameInstructionsSkeletonProps {
  stage: StageId;
}

export function GameInstructionsSkeleton({ stage }: Readonly<GameInstructionsSkeletonProps>) {
  const theme = STAGE_THEME_COLORS[stage];
  const overlay = STAGE_OVERLAYS[stage];

  return (
    <div className="instructionViewport">
      <section
        className="instructionRoot"
        style={{ backgroundColor: theme.background }}
        aria-busy="true"
        aria-label="Loading game instructions"
      >
        <img src={overlay} alt="" aria-hidden className="overlay" />
        <div
          className="eclipse"
          style={{ '--eclipse-color': theme.eclipse } as React.CSSProperties}
        />

        <div className="content">
          {/* game-header */}
          <div className="game-header">
            <div className="metaRow">
              <div
                className="skeleton-pulse"
                style={{ width: 90, height: 12, borderRadius: 4, background: SHIMMER_MID }}
              />
              <div
                className="skeleton-pulse"
                style={{ width: 63, height: 20, borderRadius: 999, background: SHIMMER_DARK }}
              />
            </div>
            <div
              className="skeleton-pulse"
              style={{
                width: '52%',
                height: 20,
                marginTop: 10,
                marginBottom: 10,
                borderRadius: 4,
                background: SHIMMER_MID,
              }}
            />
          </div>

          {/* carouselSection */}
          <div className="carouselSection">
            <div className="viewport">
              <div className="slideContainer">
                <article className="slide slideActive">
                  <div className="card">
                    {/* cardTitle */}
                    <div
                      className="skeleton-pulse"
                      style={{
                        width: '58%',
                        height: 26,
                        margin: '0 auto',
                        borderRadius: 4,
                        background: SHIMMER_MID,
                      }}
                    />
                    {/* cardDescription */}
                    <div
                      className="skeleton-pulse"
                      style={{
                        width: '80%',
                        height: 14,
                        margin: '14px auto 0',
                        borderRadius: 4,
                        background: SHIMMER_DARK,
                      }}
                    />

                    {/* list items */}
                    <div style={{ marginTop: 16 }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: 14,
                            marginTop: i === 0 ? 0 : 18,
                            alignItems: 'flex-start',
                          }}
                        >
                          {/* badge */}
                          <div
                            className="skeleton-pulse"
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 999,
                              flexShrink: 0,
                              background: SHIMMER_DARK,
                            }}
                          />
                          {/* itemContent */}
                          <div style={{ flex: 1, paddingTop: 3 }}>
                            <div
                              className="skeleton-pulse"
                              style={{
                                width: '68%',
                                height: 16,
                                borderRadius: 4,
                                background: SHIMMER_MID,
                              }}
                            />
                            <div
                              className="skeleton-pulse"
                              style={{
                                width: '88%',
                                height: 13,
                                marginTop: 7,
                                borderRadius: 4,
                                background: SHIMMER_DARK,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              </div>
            </div>

            {/* dots */}
            <div className="dots">
              <div
                className="skeleton-pulse"
                style={{ width: 34, height: 8, borderRadius: 999, background: SHIMMER_LIGHT }}
              />
              <div
                className="skeleton-pulse"
                style={{ width: 8, height: 8, borderRadius: 999, background: SHIMMER_DARK }}
              />
            </div>
          </div>

          {/* ctaStack */}
          <div className="ctaStack">
            <div
              className="skeleton-pulse"
              style={{
                width: '100%',
                height: 55,
                borderRadius: 100,
                background: 'rgba(255,212,132,0.28)',
              }}
            />
            <div
              className="skeleton-pulse"
              style={{ width: '100%', height: 55, borderRadius: 100, background: SHIMMER_MID }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
