import { GAME_CONFIGS, GAME_SESSION_STATUS } from "@common/constants";
import { config } from "@config";
import { Injectable, Logger } from "@nestjs/common";
import * as restateClients from "@restatedev/restate-sdk-clients";

import {
  GAME_EXPIRY_RESTATE_TARGET,
  type GameExpiryRequest,
} from "./game-expiry.restate";

interface GameExpirySendClient {
  markResultProcessing(
    input: GameExpiryRequest,
    options: unknown,
  ): Promise<void>;
  finalizeExpiredSession(
    input: GameExpiryRequest,
    options: unknown,
  ): Promise<void>;
}

interface RestateClientLike {
  serviceSendClient(
    target: typeof GAME_EXPIRY_RESTATE_TARGET,
  ): GameExpirySendClient;
}

@Injectable()
export class GameExpiryService {
  private readonly logger = new Logger(GameExpiryService.name);
  private readonly restateClient = restateClients.connect({
    url: config.restate.ingressUrl,
  }) as unknown as RestateClientLike;

  async schedule(
    sessionId: string,
    expiryAtMs: number,
    ownerKey: string,
    stageId: string,
    currentStatus: string = GAME_SESSION_STATUS.STARTED,
  ): Promise<void> {
    const now = Date.now();
    const graceMs = GAME_CONFIGS.EXPIRY_GRACE_SECONDS * 1000;
    const resultProcessingDelayMs = Math.max(0, expiryAtMs - now);
    const finalizeDelayMs = Math.max(0, expiryAtMs + graceMs - now);
    const payload: GameExpiryRequest = {
      sessionId,
      objectKey: `${ownerKey}:${stageId}`,
    };
    const client = this.restateClient.serviceSendClient(
      GAME_EXPIRY_RESTATE_TARGET,
    );

    if (currentStatus === GAME_SESSION_STATUS.STARTED) {
      await client.markResultProcessing(
        payload,
        restateClients.rpc.sendOpts({
          delay: resultProcessingDelayMs,
          idempotencyKey: `game-expiry:${sessionId}:result-processing`,
        }),
      );
    }

    await client.finalizeExpiredSession(
      payload,
      restateClients.rpc.sendOpts({
        delay: finalizeDelayMs,
        idempotencyKey: `game-expiry:${sessionId}:finalize`,
      }),
    );

    this.logger.debug(
      `Scheduled durable expiry handlers for session ${sessionId}`,
    );
  }
}
