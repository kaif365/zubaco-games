import * as restate from '@restatedev/restate-sdk';
import type { GameService } from '../game/game.service';
import type { InFlightSession } from './restate-state.types';
import { STATE_KEY_SESSION } from './restate-state.types';

export interface StartGameRequest {
  userId: string;
  stageId: string;
}

export interface ExpireSessionRequest {
  sessionId: string;
}

export const RESTATE_SERVICE_NAME = 'GameSessionObject';

export function createGameSessionObject(gameService: GameService) {
  return restate.object({
    name: RESTATE_SERVICE_NAME,
    handlers: {
      startGame: async (ctx: restate.ObjectContext, req: StartGameRequest) => {
        const existing = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
        if (existing && existing.status === 'active') {
          return gameService.buildResumeResponse(existing);
        }

        const result = await ctx.run('create-session', () =>
          gameService.startGame(req.userId, { clientSeed: 'restate' }),
        );

        const session: InFlightSession = {
          sessionId: result.gameSessionId,
          userId: req.userId,
          stageId: req.stageId,
          status: 'active',
          expiryAtMs: new Date(result.endTime).getTime(),
          startedAtMs: Date.now(),
          finalSeed: 0,
          serverSeed: '',
          clientSeed: '',
          nonce: 0,
        };
        ctx.set(STATE_KEY_SESSION, session);

        await ctx.run('schedule-expiry', () =>
          gameService.scheduleExpiry(session.sessionId, session.expiryAtMs),
        );

        return result;
      },

      expireSession: async (ctx: restate.ObjectContext, req: ExpireSessionRequest) => {
        const session = await ctx.get<InFlightSession>(STATE_KEY_SESSION);
        if (!session || session.sessionId !== req.sessionId) return;
        if (session.status !== 'active') return;

        await ctx.run('expire-session', () =>
          gameService.expireSession(req.sessionId),
        );

        ctx.set(STATE_KEY_SESSION, { ...session, status: 'expired' as const });
      },

      clearState: async (ctx: restate.ObjectContext) => {
        ctx.clearAll();
      },
    },
  });
}
