'use client';

// WebView bootstrap for Next.js games.
// Must be imported in the root layout as a client component.

import { useEffect } from 'react';

export function WebViewBootstrap() {
  useEffect(() => {
    // Dynamic import of bootstrap (runs once on client mount)
    import('../../../../packages/game-sdk/src/bootstrap');
  }, []);

  return null;
}
