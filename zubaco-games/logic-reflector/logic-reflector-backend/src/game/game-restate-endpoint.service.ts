import * as http2 from "http2";

import { config } from "@config";
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import * as restate from "@restatedev/restate-sdk/node";

import { createGameExpiryRestateService } from "./game-expiry.restate";
import { createGameSessionRestateObject } from "./game-session.restate";
import { GameService } from "./game.service";

@Injectable()
export class GameRestateEndpointService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(GameRestateEndpointService.name);
  private server: http2.Http2Server | null = null;

  /**
   * Create a new instance.
   *
   * @param {GameService} gameService - Game service used by Restate handlers.
   */
  constructor(private readonly gameService: GameService) {}

  /**
   * Start the Restate endpoint.
   *
   * @returns {Promise<void>} Resolves when the endpoint is listening.
   */
  async onModuleInit(): Promise<void> {
    const handler = restate.createEndpointHandler({
      services: [
        createGameExpiryRestateService(),
        createGameSessionRestateObject(this.gameService),
      ],
    });

    this.server = http2.createServer(handler);

    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(config.restate.endpointPort, () => {
        this.server!.off("error", reject);
        resolve();
      });
    });

    this.logger.log(
      `Restate endpoint listening on port ${config.restate.endpointPort}`,
    );
  }

  /**
   * Stop the Restate endpoint.
   *
   * @returns {Promise<void>} Resolves when the endpoint is closed.
   */
  async onModuleDestroy(): Promise<void> {
    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server!.close((error) => (error ? reject(error) : resolve()));
    });
    this.server = null;
  }
}
