import type { ReactNode } from 'react';

import { OfflineStatusModal } from '@/components/shared/OfflineStatusModal';

import { ApiErrorProvider } from './ApiErrorProvider';
import { AppBootstrapGate } from './AppBootstrapGate';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppBootstrapGate>
      <ApiErrorProvider>
        {children}
        <OfflineStatusModal />
      </ApiErrorProvider>
    </AppBootstrapGate>
  );
}
