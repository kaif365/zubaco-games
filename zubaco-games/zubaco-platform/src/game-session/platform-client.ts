/**
 * Platform SDK — Used by individual game backends to communicate with the Zubaco Platform.
 *
 * Each game backend imports this to:
 * 1. Report game completion (submitResult)
 * 2. Start a game session via platform
 * 3. Validate that a session is legitimate
 *
 * Environment variables required:
 *   PLATFORM_BASE_URL — e.g., http://localhost:3000 or https://api.zubaco.com
 *   INTERNAL_API_KEY — Shared secret between platform and game backends
 */

export interface PlatformStartGameRequest {
  userId: string;
  gameType: string;
  config?: Record<string, any>;
  mode?: 'FREE_PLAY' | 'TOURNAMENT';
}

export interface PlatformStartGameResponse {
  gameSessionId: string;
  serverSeedHash: string;
  seed: number;
  startedAt: string;
  config?: Record<string, any>;
}

export interface PlatformSubmitResultRequest {
  sessionId: string;
  userId: string;
  score: number;
  durationMs: number;
  gameType: string;
  metadata?: Record<string, any>;
}

export interface PlatformSubmitResultResponse {
  success: boolean;
  score: number;
  flags_raised: number;
}

export class PlatformClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || process.env.PLATFORM_BASE_URL || 'http://localhost:3000';
    this.apiKey = apiKey || process.env.INTERNAL_API_KEY || '';
  }

  /**
   * Start a game session on the platform.
   * Call this when the game frontend requests to start playing.
   */
  async startGame(request: PlatformStartGameRequest): Promise<PlatformStartGameResponse> {
    const response = await fetch(`${this.baseUrl}/internal/game/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Platform startGame failed (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Submit the final game result to the platform.
   * Call this when a game session ends (player finishes or times out).
   * Platform will validate the score, run anti-cheat, and update leaderboards.
   */
  async submitResult(request: PlatformSubmitResultRequest): Promise<PlatformSubmitResultResponse> {
    const response = await fetch(`${this.baseUrl}/internal/game/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Platform submitResult failed (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Verify a platform JWT token (extracts userId from it).
   * Game backends can use this to validate tokens injected by WebView.
   * Note: For local validation without network call, use verifyJwtLocally() instead.
   */
  async verifyToken(token: string): Promise<{ userId: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }
}

/**
 * Verify a platform-issued JWT locally without a network call.
 * Requires the same JWT_ACCESS_SECRET used by the platform.
 *
 * @param token - The JWT access token
 * @param secret - The JWT_ACCESS_SECRET (must match platform's)
 * @returns The userId from the token payload, or null if invalid/expired
 */
export function verifyPlatformJwt(token: string, secret: string): { userId: string } | null {
  try {
    // Decode JWT without library — simple base64 decode for payload
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Verify signature using HMAC-SHA256
    const crypto = require('crypto');
    const header = parts[0];
    const payload = parts[1];
    const signature = parts[2];

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    // Decode payload
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());

    // Check expiry
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;

    // Check token type
    if (decoded.type !== 'access') return null;

    return { userId: decoded.sub };
  } catch {
    return null;
  }
}
