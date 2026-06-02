import type { ReactNode } from 'react';

import { QueryProvider } from './QueryProvider';
import { SocketProvider } from './SocketProvider';
import { ToastProvider } from './ToastProvider';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <SocketProvider>
        <ToastProvider>{children}</ToastProvider>
      </SocketProvider>
    </QueryProvider>
  );
}
