import * as http2 from 'http2';

import { config } from '@config';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as restate from '@restatedev/restate-sdk/node';

import { createGameExpiryRestateService } from './game-expiry.restate';
import { createGameSessionRestateObject } from './game-session.restate';
import { GameService } from './game.service';

type RestateHttpHandler = (
    request: http2.Http2ServerRequest,
    response: http2.Http2ServerResponse<http2.Http2ServerRequest>,
) => void;

interface RestateEndpointBuilder {
    bind(service: unknown): RestateEndpointBuilder;
    handler(): RestateHttpHandler;
}

@Injectable()
export class GameRestateEndpointService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(GameRestateEndpointService.name);
    private server: http2.Http2Server | null = null;

    constructor(private readonly gameService: GameService) {}

    async onModuleInit(): Promise<void> {
        const endpoint = restate.endpoint() as unknown as RestateEndpointBuilder;
        const handler = endpoint
            .bind(createGameExpiryRestateService())
            .bind(createGameSessionRestateObject(this.gameService))
            .handler();

        this.server = http2.createServer(handler);

        await new Promise<void>((resolve, reject) => {
            this.server!.once('error', reject);
            this.server!.listen(config.restate.endpointPort, () => {
                this.server!.off('error', reject);
                resolve();
            });
        });

        this.logger.log(`Restate endpoint listening on port ${config.restate.endpointPort}`);
    }

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
