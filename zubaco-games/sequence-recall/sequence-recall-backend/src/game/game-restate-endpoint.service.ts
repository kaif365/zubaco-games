import * as http2 from 'http2';

import { config } from '@config';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as restate from '@restatedev/restate-sdk/node';

import { createGameExpiryRestateService } from './game-expiry.restate';
import { createGameSessionRestateObject } from './game-session.restate';
import { GameService } from './game.service';

@Injectable()
export class GameRestateEndpointService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(GameRestateEndpointService.name);
    private server: http2.Http2Server | null = null;
    private ownsServer = false;

    constructor(private readonly gameService: GameService) {}

    /**
     * Start the Restate HTTP/2 endpoint that the Restate server will invoke.
     *
     * @returns {Promise<void>} Resolves when listening.
     */
    async onModuleInit(): Promise<void> {
        if (!config.restate.endpointEnabled) {
            this.logger.log('Restate endpoint server disabled via RESTATE_ENDPOINT_ENABLED=false');
            return;
        }

        const handler = restate.createEndpointHandler({
            services: [
                createGameExpiryRestateService(),
                createGameSessionRestateObject(this.gameService),
            ],
        });

        this.server = http2.createServer(handler);

        try {
            await new Promise<void>((resolve, reject) => {
                this.server!.once('error', reject);
                this.server!.listen(config.restate.endpointPort, () => {
                    this.server!.off('error', reject);
                    resolve();
                });
            });
            this.ownsServer = true;
        } catch (error) {
            const listenError = error as NodeJS.ErrnoException;
            if (listenError.code === 'EADDRINUSE') {
                this.logger.warn(
                    `Restate endpoint port ${config.restate.endpointPort} is already in use; assuming another backend instance is hosting the endpoint and continuing startup`,
                );
                this.server.close();
                this.server = null;
                return;
            }

            this.server.close();
            this.server = null;
            throw error;
        }

        this.logger.log(
            `Restate endpoint ready — port=${config.restate.endpointPort} ` +
                `ingressUrl=${config.restate.ingressUrl} ` +
                `services=[SequenceRecallGameSessionRestateObject, SequenceRecallGameExpiryRestateService]`,
        );
    }

    /**
     * Gracefully stop the Restate HTTP/2 endpoint.
     *
     * @returns {Promise<void>} Resolves when closed.
     */
    async onModuleDestroy(): Promise<void> {
        if (!this.server || !this.ownsServer) {
            return;
        }
        await new Promise<void>((resolve, reject) => {
            this.server!.close((err) => (err ? reject(err) : resolve()));
        });
        this.server = null;
        this.ownsServer = false;
    }
}
