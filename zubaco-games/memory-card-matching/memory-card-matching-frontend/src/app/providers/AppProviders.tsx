import type { ReactNode } from 'react';

import { OfflineStatusModal } from '@/components/shared/OfflineStatusModal';
import { I18nProvider } from '@/lib/i18n/provider';

import { ApiErrorProvider } from './ApiErrorProvider';
import { AppBootstrapGate } from './AppBootstrapGate';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <I18nProvider>
      <AppBootstrapGate>
        <ApiErrorProvider>
          {children}
          <OfflineStatusModal />
        </ApiErrorProvider>
      </AppBootstrapGate>
    </I18nProvider>
  );
}
