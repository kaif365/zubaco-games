/**
 * Shared Game Session Guard — for use in individual game backends.
 *
 * This guard:
 * 1. Validates the platform JWT from the Authorization header
 * 2. Extracts the gameSessionId + mode from the request
 * 3. In TOURNAMENT mode, rejects any client-supplied config overrides
 *
 * Usage in a game backend:
 *   @UseGuards(PlatformSessionGuard)
 *   @Post('start')
 *   async startGame(@Req() req) {
 *     const { userId, gameSessionId, mode, config } = req.platformSession;
 *     // config is ONLY from platform (server-side) in tournament mode
 *   }
 */

import { verifyPlatformJwt } from './platform-client';

export interface PlatformSessionData {
  userId: string;
  gameSessionId: string;
  mode: 'FREE_PLAY' | 'TOURNAMENT';
  seed: number;
  config: Record<string, any>;
}

/**
 * Middleware/Guard factory for game backends.
 * Validates JWT, extracts session info, and enforces tournament config.
 *
 * @param jwtSecret - The shared JWT_ACCESS_SECRET
 * @returns Express middleware function
 */
export function createPlatformSessionMiddleware(jwtSecret: string) {
  return (req: any, res: any, next: any) => {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);
    const result = verifyPlatformJwt(token, jwtSecret);
    if (!result) {
      return res.status(401).json({ error: 'Invalid or expired platform token' });
    }

    // Extract game session parameters (injected by mobile WebView)
    const gameSessionId = req.headers['x-game-session-id'] || req.body?.gameSessionId;
    const mode = req.headers['x-game-mode'] || req.body?.mode || 'FREE_PLAY';
    const seed = parseInt(req.headers['x-game-seed'] || req.body?.seed || '0', 10);
    const serverConfig = req.headers['x-game-config']
      ? JSON.parse(req.headers['x-game-config'])
      : req.body?.serverConfig;

    // TOURNAMENT MODE: Reject any client-supplied game configuration
    if (mode === 'TOURNAMENT') {
      const clientConfig = req.body?.config || req.body?.levelConfig;
      if (clientConfig && Object.keys(clientConfig).length > 0) {
        return res.status(403).json({
          error: 'Tournament mode: client config overrides are not allowed',
          message: 'Game configuration is enforced by the platform in tournament mode',
        });
      }
    }

    // Attach platform session data to the request
    req.platformSession = {
      userId: result.userId,
      gameSessionId,
      mode,
      seed,
      config: serverConfig || {},
    } as PlatformSessionData;

    next();
  };
}

/**
 * Get the effective game config — uses server config in tournament mode,
 * allows client overrides in free play mode.
 */
export function getEffectiveConfig(
  platformSession: PlatformSessionData,
  clientConfig?: Record<string, any>,
): Record<string, any> {
  if (platformSession.mode === 'TOURNAMENT') {
    // In tournament mode, ONLY use server-provided config
    return platformSession.config;
  }

  // In free play, merge server defaults with client overrides
  return { ...platformSession.config, ...clientConfig };
}
