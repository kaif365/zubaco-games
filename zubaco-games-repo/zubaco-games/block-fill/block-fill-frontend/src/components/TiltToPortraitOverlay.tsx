import { useTranslation } from 'react-i18next';

import { IMAGES } from '@/assets/images';
import '@/styles/tilt-to-portrait.css';

/**
 * Full-screen overlay (keep game mounted underneath). Blocks interaction until portrait.
 *
 * @returns The tilt prompt layer
 */
export function TiltToPortraitOverlay() {
  const { t } = useTranslation();
  return (
    <div
      className="bg-mainbackground fixed inset-0 z-50 flex min-h-dvh w-full items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tilt-to-portrait-title"
    >
      <div className="gradient-layer-top absolute inset-0" />
      <div className="flex h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 text-center backdrop-blur-sm">
        <div
          className="pointer-events-none absolute inset-0 top-1/2 h-full -translate-y-1/2 scale-150 bg-contain bg-center bg-no-repeat opacity-20 md:h-[80vh]"
          style={{ backgroundImage: `url('${IMAGES.brownBg}')` }}
        />
        <div className="phone" />
        <div className="message mt-8">
          <p
            id="tilt-to-portrait-title"
            className="gradient-text text-lg font-bold uppercase tracking-[0.14em]"
          >
            {t('tilt.title')}
          </p>
          <p className="tilt-message-body mx-auto max-w-[340px] text-center text-[14px] tracking-[0.13em]">
            {t('tilt.message')}
          </p>
        </div>
      </div>
    </div>
  );
}
