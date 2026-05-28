import * as restate from '@restatedev/restate-sdk';
import * as restateClients from '@restatedev/restate-sdk-clients';
import { RESTATE_SERVICE_NAME, type ExpireSessionRequest } from './game-session.object';

export interface GameExpiryRequest {
  sessionId: string;
  objectKey: string;
}

export const GAME_EXPIRY_SERVICE_NAME = 'GameExpiryService';

export function createGameExpiryService() {
  return restate.service({
    name: GAME_EXPIRY_SERVICE_NAME,
    handlers: {
      expireSession: async (ctx: restate.Context, req: GameExpiryRequest) => {
        const client = ctx.objectClient<Record<string, never>>(
          { name: RESTATE_SERVICE_NAME } as never,
          req.objectKey,
        );
        await (client as unknown as { expireSession: (r: ExpireSessionRequest) => Promise<void> })
          .expireSession({ sessionId: req.sessionId });
      },
    },
  });
}

export async function scheduleExpiryViaRestate(
  ingressUrl: string,
  sessionId: string,
  objectKey: string,
  delayMs: number,
) {
  const client = restateClients.connect({ url: ingressUrl });
  const svc = client.serviceSendClient({ name: GAME_EXPIRY_SERVICE_NAME } as never);
  await (svc as unknown as { expireSession: (req: GameExpiryRequest, opts?: unknown) => Promise<void> })
    .expireSession(
      { sessionId, objectKey },
      restateClients.rpc.sendOpts({
        delay: delayMs,
        idempotencyKey: `game-expiry:${sessionId}`,
      }),
    );
}
