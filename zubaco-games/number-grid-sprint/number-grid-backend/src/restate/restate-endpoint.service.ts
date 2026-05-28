import * as http2 from 'http2';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as restate from '@restatedev/restate-sdk/node';
import { GameService } from '../game/game.service';
import { createGameSessionObject } from './game-session.object';
import { createGameExpiryService } from './game-expiry.service';

@Injectable()
export class RestateEndpointService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RestateEndpointService.name);
  private server: http2.Http2Server | null = null;

  constructor(private readonly gameService: GameService) {}

  async onModuleInit(): Promise<void> {
    const port = parseInt(process.env.RESTATE_ENDPOINT_PORT || '0', 10);
    if (!port) {
      this.logger.log('RESTATE_ENDPOINT_PORT not set — Restate disabled (fallback mode)');
      return;
    }

    const handler = restate.createEndpointHandler({
      services: [
        createGameSessionObject(this.gameService),
        createGameExpiryService(),
      ],
    });

    this.server = http2.createServer(handler);

    try {
      await new Promise<void>((resolve, reject) => {
        this.server!.once('error', reject);
        this.server!.listen(port, () => {
          this.server!.off('error', reject);
          resolve();
        });
      });
      this.logger.log(`Restate endpoint listening on port ${port}`);
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'EADDRINUSE') {
        this.logger.warn(`Restate port ${port} in use — running without Restate`);
        this.server = null;
        return;
      }
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) => {
      this.server!.close((err) => (err ? reject(err) : resolve()));
    });
    this.server = null;
  }
}
