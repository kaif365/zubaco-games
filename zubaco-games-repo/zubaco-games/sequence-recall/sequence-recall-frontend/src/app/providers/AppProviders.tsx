import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { IMAGES } from '@/assets/images';
import { preloadImages } from '@/assets/preloadImages';
import { AudioProvider } from '@/audio/AudioProvider';
import { I18nProvider } from '@/lib/i18n';
import { OfflineStatusModal } from '@components/shared/OfflineStatusModal';

import { ApiErrorProvider } from './ApiErrorProvider';
import { AppBootstrapGate } from './AppBootstrapGate';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  useEffect(() => {
    preloadImages(Object.values(IMAGES));
  }, []);

  return (
    <I18nProvider>
      <AudioProvider>
        <AppBootstrapGate>
          <ApiErrorProvider>
            {children}
            <OfflineStatusModal />
          </ApiErrorProvider>
        </AppBootstrapGate>
      </AudioProvider>
    </I18nProvider>
  );
}
