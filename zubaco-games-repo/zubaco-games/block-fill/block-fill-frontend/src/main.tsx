import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { AudioProvider } from '@/audio';
import { queryClient } from '@/app/queryClient';
import { I18nProvider } from '@/lib/i18n';
import '@/index.css';
import { App } from '@/app/App';
import { AppProviders } from '@/app/providers/AppProviders';
import { disableCopyAndSelection, disableDevTools } from '@/utils/security';
import { initSecureStorage } from '@/utils/secureStorage';
import { AUTH_STORAGE_KEY } from '@/app/authSession';
import { ACTIVE_SESSION_KEY } from '@/features/flow-puzzle/sessionStorage/activeSessionStorage';
import { OUTBOX_STORAGE_KEY } from '@/features/flow-puzzle/save-progress/saveProgressOutbox';

// Apply client-side security hardening on every startup (not gated by env flag).
disableDevTools();
disableCopyAndSelection();

void (async () => {
  await initSecureStorage([AUTH_STORAGE_KEY, ACTIVE_SESSION_KEY, OUTBOX_STORAGE_KEY]);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <AudioProvider>
            <AppProviders>
              <App />
            </AppProviders>
          </AudioProvider>
        </QueryClientProvider>
      </I18nProvider>
    </StrictMode>,
  );
})();
