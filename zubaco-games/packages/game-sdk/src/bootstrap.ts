// ─── WebView Bootstrap ──────────────────────────────────────────
// Import this at the TOP of any game's main.tsx/main.ts to enable WebView support.
// It reads window.__ZUBACO__ and populates all known token storage locations.
//
// Usage: import '@zubaco/game-sdk/bootstrap';   (first line of main.tsx)

(function zubacoBootstrap() {
  const ctx = (window as any).__ZUBACO__;
  if (!ctx) return; // Not running in WebView — dev mode, do nothing

  const { token, gameSessionId, platform, apiBaseUrl } = ctx;

  // ─── Populate all storage locations that games read from ──────
  if (token) {
    // sessionStorage (used by: true-false-blitz, word-unscramble, colour-sorting, flash-spot)
    try { sessionStorage.setItem('auth_token', token); } catch {}
    // localStorage (used by: memory-groups, flash-spot socket, sliding-puzzle fallback)
    try { localStorage.setItem('auth_token', token); } catch {}
    try { localStorage.setItem('token', token); } catch {}
    // For games using secure/encrypted storage key
    try { sessionStorage.setItem('zubaco_auth_token', token); } catch {}
  }

  // ─── Store session context for games that need it ─────────────
  if (gameSessionId) {
    try { sessionStorage.setItem('game_session_id', gameSessionId); } catch {}
    try { localStorage.setItem('game_session_id', gameSessionId); } catch {}
  }

  if (platform) {
    try { sessionStorage.setItem('zubaco_platform', platform); } catch {}
  }

  if (apiBaseUrl) {
    try { sessionStorage.setItem('zubaco_api_base_url', apiBaseUrl); } catch {}
  }

  // ─── Inject token into URL params (for games that read ?token=) ──
  // Only if not already present
  const url = new URL(window.location.href);
  if (token && !url.searchParams.has('token')) {
    url.searchParams.set('token', token);
    window.history.replaceState(null, '', url.toString());
  }
  if (gameSessionId && !url.searchParams.has('sessionId')) {
    url.searchParams.set('sessionId', gameSessionId);
    window.history.replaceState(null, '', url.toString());
  }

  // ─── Signal to host that game is ready ────────────────────────
  const emit = (type: string, payload?: Record<string, unknown>) => {
    const msg = JSON.stringify({ type, payload, timestamp: Date.now() });
    if ((window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(msg);
    } else if (window.parent !== window) {
      window.parent.postMessage({ type, payload, timestamp: Date.now() }, '*');
    }
  };

  emit('GAME_READY', { gameSessionId });

  // ─── Expose lifecycle signals globally ────────────────────────
  // Games can call window.__ZUBACO_EMIT__('GAME_COMPLETED', { score: 100 })
  (window as any).__ZUBACO_EMIT__ = emit;

  // ─── Listen for host commands ─────────────────────────────────
  window.addEventListener('message', (event) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data?.type === 'FORCE_EXIT') {
        emit('GAME_EXIT');
      }
    } catch {}
  });
})();
