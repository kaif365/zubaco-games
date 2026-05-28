import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { I18nProvider } from '@/lib/i18n';

import App from './App';
import './styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found. Check index.html has <div id="root">.');

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
