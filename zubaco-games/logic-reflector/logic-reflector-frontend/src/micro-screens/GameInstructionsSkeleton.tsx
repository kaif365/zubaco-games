import type { CSSProperties } from 'react';

import type { StageId } from './types/stage-theme';
import { STAGE_THEME_COLORS } from './theme/colors';
import './instructions-screen.css';

interface GameInstructionsSkeletonProps {
  readonly stage: StageId;
}

export function GameInstructionsSkeleton({ stage }: Readonly<GameInstructionsSkeletonProps>) {
  const theme = STAGE_THEME_COLORS[stage];

  return (
    <div className="instructionViewport">
      <section
        className="instructionRoot"
        style={{ backgroundColor: theme.background } as CSSProperties}
        aria-busy="true"
        aria-label="Loading"
      >
        <div
          className="eclipse"
          style={{ '--eclipse-color': theme.eclipse } as CSSProperties}
        />

        <div className="content">
          <div className="metaRow">
            <span className="skeletonBar" style={{ height: 14, width: 90, display: 'block' }} />
            <span className="skeletonBar" style={{ height: 20, width: 60, borderRadius: 999, display: 'block' }} />
          </div>
          <div className="skeletonBar" style={{ height: 22, width: '65%', marginTop: 10, marginBottom: 14 }} />

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

            <div className="dots">
              <span className="dot dotActive skeletonBar" style={{ animationDelay: '0ms' }} />
              <span className="dot skeletonBar" style={{ background: 'rgba(255,255,255,0.12)', animationDelay: '150ms' }} />
              <span className="dot skeletonBar" style={{ background: 'rgba(255,255,255,0.12)', animationDelay: '300ms' }} />
            </div>
          </div>

          <div className="ctaStack">
            <div
              className="skeletonBar"
              style={{ height: 54, borderRadius: 100, background: 'rgba(255,212,132,0.25)', animationDelay: '0ms' }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
