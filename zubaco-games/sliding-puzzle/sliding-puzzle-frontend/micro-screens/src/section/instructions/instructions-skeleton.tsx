import type { CSSProperties } from 'react';

import type { StageId } from '@micro-screens/src/types/stage-theme';
import { STAGE_THEME_COLORS } from '@micro-screens/theme/colors';

import './instructions-screen.css';
import { getCloudFrontAssetUrl } from '@/utils/asset-utils';

const STAGE_OVERLAYS: Record<StageId, string> = {
  1: getCloudFrontAssetUrl('stage-1/Stage_1.png'),
  2: getCloudFrontAssetUrl('stage-2/Stage_2.png'),
  3: getCloudFrontAssetUrl('stage-3/Stage_3.png'),
  4: getCloudFrontAssetUrl('stage-4/Stage_4.png'),
  5: getCloudFrontAssetUrl('stage-5/Stage_5.png'),
  6: getCloudFrontAssetUrl('stage-6/Stage_6.png'),
  7: getCloudFrontAssetUrl('stage-7/Stage_7.png'),
};

interface GameInstructionsSkeletonProps {
  readonly stage: StageId;
}

export function GameInstructionsSkeleton({
  stage,
}: Readonly<GameInstructionsSkeletonProps>) {
  const theme = STAGE_THEME_COLORS[stage];
  const overlay = STAGE_OVERLAYS[stage];

  return (
    <div className="instructionViewport">
      <section
        className="instructionRoot"
        style={
          {
            backgroundColor: theme.background,
            '--eclipse-color': theme.eclipse,
          } as CSSProperties
        }
        aria-busy="true"
        aria-label="Loading"
      >
        <img src={overlay} alt="" aria-hidden className="overlay" />
        <div
          className="eclipse"
          style={{ '--eclipse-color': theme.eclipse } as CSSProperties}
        />

        <div className="content">
          {/* Header */}
          <div className="metaRow">
            <span className="skeletonBar" style={{ height: 14, width: 90, display: 'block' }} />
            <span className="skeletonBar" style={{ height: 20, width: 60, borderRadius: 999, display: 'block' }} />
          </div>
          <div className="skeletonBar" style={{ height: 22, width: '65%', marginTop: 10, marginBottom: 14 }} />

          {/* Card */}
          <div className="carouselSection">
            <div className="viewport">
              <div className="slideContainer">
                <div className="slide slideActive">
                  <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="skeletonBar" style={{ height: 20, width: '55%', margin: '0 auto' }} />
                    <div className="skeletonBar" style={{ height: 14, width: '100%', marginTop: 18, opacity: 0.7 }} />
                    <div className="skeletonBar" style={{ height: 14, width: '85%', marginTop: 8, opacity: 0.7 }} />

                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ display: 'flex', gap: 14, marginTop: 20, alignItems: 'flex-start' }}>
                        <div
                          className="skeletonBar"
                          style={{ width: 50, height: 50, borderRadius: 999, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, paddingTop: 3 }}>
                          <div className="skeletonBar" style={{ height: 14, width: '80%' }} />
                          <div className="skeletonBar" style={{ height: 12, width: '60%', marginTop: 6, opacity: 0.6 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dots */}
            <div className="dots">
              <span className="dot dotActive skeletonBar" style={{ animationDelay: '0ms' }} />
              <span className="dot skeletonBar" style={{ background: 'rgba(255,255,255,0.12)', animationDelay: '150ms' }} />
              <span className="dot skeletonBar" style={{ background: 'rgba(255,255,255,0.12)', animationDelay: '300ms' }} />
            </div>
          </div>

          {/* Buttons */}
          <div className="ctaStack">
            <div
              className="skeletonBar"
              style={{ height: 54, borderRadius: 100, background: 'rgba(255,212,132,0.25)', animationDelay: '0ms' }}
            />
            <div
              className="skeletonBar"
              style={{ height: 54, borderRadius: 100, background: 'rgba(255,255,255,0.12)', animationDelay: '200ms' }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
