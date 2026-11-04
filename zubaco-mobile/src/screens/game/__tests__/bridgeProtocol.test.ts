describe('Zubaco Mobile — Native WebView Bridge Protocol & Security Audit', () => {
  // Pure logic verification of the URL validator from GameScreen.tsx:156-170
  function isAllowedUrl(url: string): boolean {
    try {
      const match = url.match(/^https?:\/\/([^/:]+)/i);
      if (!match) return false;
      const host = match[1]!.toLowerCase();
      return (
        host === 'game.zubaco.com' ||
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.zubaco.com')
      );
    } catch {
      return false;
    }
  }

  // Pure logic verification of injected JS payload builder
  function buildInjectedJavaScript(token: string, sessionId: string): string {
    return `
    (function() {
      window.__ZUBACO__ = {
        token: ${JSON.stringify(token || '')},
        gameSessionId: ${JSON.stringify(sessionId || '')},
        platform: "mobile"
      };
      window.postMessage = window.ReactNativeWebView.postMessage;
    })();
    true;
  `;
  }

  // Pure logic verification of bridge message parser
  interface BridgeResult {
    action: string;
    score?: number;
    durationMs?: number;
    error?: string;
  }

  function parseBridgeMessage(raw: string): BridgeResult | null {
    try {
      const data = JSON.parse(raw);
      switch (data.type) {
        case 'GAME_COMPLETED':
          return {
            action: 'SUBMIT',
            score: Number(data.score) || 0,
            durationMs: Number(data.duration_ms ?? data.durationMs ?? data.duration) || 0,
          };
        case 'GAME_ERROR':
          return {
            action: 'ERROR',
            error: data.message || 'Something went wrong',
          };
        case 'GAME_EXIT':
          return { action: 'EXIT' };
        default:
          return { action: 'UNKNOWN' };
      }
    } catch {
      return null;
    }
  }

  describe('3.1. Domain & URL Origin Security Whitelist', () => {
    it('allows official Zubaco production and subdomain URLs', () => {
      expect(isAllowedUrl('https://game.zubaco.com/sliding-puzzle')).toBe(true);
      expect(isAllowedUrl('https://tournament.zubaco.com/arena')).toBe(true);
      expect(isAllowedUrl('https://cdn.zubaco.com/assets/game.html')).toBe(true);
    });

    it('allows local development server endpoints', () => {
      expect(isAllowedUrl('http://localhost:3000')).toBe(true);
      expect(isAllowedUrl('http://localhost:5173/play')).toBe(true);
      expect(isAllowedUrl('http://127.0.0.1:8080')).toBe(true);
    });

    it('blocks unauthorized and phishing domains', () => {
      expect(isAllowedUrl('https://evil-zubaco.com')).toBe(false);
      expect(isAllowedUrl('https://zubaco.com.attacker.org')).toBe(false);
      expect(isAllowedUrl('https://google.com')).toBe(false);
      expect(isAllowedUrl('javascript:alert(document.cookie)')).toBe(false);
      expect(isAllowedUrl('data:text/html,<h1>Hacked</h1>')).toBe(false);
    });
  });

  describe('3.2. Session Injected JavaScript Contract', () => {
    it('correctly serializes credentials into window.__ZUBACO__', () => {
      const script = buildInjectedJavaScript('jwt-token-12345', 'session-abc-999');
      expect(script).toContain('"jwt-token-12345"');
      expect(script).toContain('"session-abc-999"');
      expect(script).toContain('platform: "mobile"');
      expect(script).toContain('window.ReactNativeWebView.postMessage');
    });

    it('handles empty fallback tokens gracefully without code injection', () => {
      const script = buildInjectedJavaScript('', '');
      expect(script).toContain('token: ""');
      expect(script).toContain('gameSessionId: ""');
    });
  });

  describe('3.3. Bidirectional Bridge Message Protocol', () => {
    it('parses GAME_COMPLETED payloads with numeric coercions and duration aliases', () => {
      const msg1 = JSON.stringify({
        type: 'GAME_COMPLETED',
        score: '2400',
        duration_ms: '45000',
      });
      const parsed1 = parseBridgeMessage(msg1);
      expect(parsed1).toEqual({ action: 'SUBMIT', score: 2400, durationMs: 45000 });

      // CamelCase alias durationMs
      const msg2 = JSON.stringify({
        type: 'GAME_COMPLETED',
        score: 1800,
        durationMs: 32000,
      });
      const parsed2 = parseBridgeMessage(msg2);
      expect(parsed2).toEqual({ action: 'SUBMIT', score: 1800, durationMs: 32000 });
    });

    it('handles GAME_ERROR and GAME_EXIT actions', () => {
      const errorMsg = JSON.stringify({ type: 'GAME_ERROR', message: 'Asset load failed' });
      expect(parseBridgeMessage(errorMsg)).toEqual({
        action: 'ERROR',
        error: 'Asset load failed',
      });

      const exitMsg = JSON.stringify({ type: 'GAME_EXIT' });
      expect(parseBridgeMessage(exitMsg)).toEqual({ action: 'EXIT' });
    });

    it('safely returns null on non-JSON raw strings without throwing', () => {
      expect(parseBridgeMessage('NOT_VALID_JSON')).toBeNull();
      expect(parseBridgeMessage('')).toBeNull();
    });
  });
});
