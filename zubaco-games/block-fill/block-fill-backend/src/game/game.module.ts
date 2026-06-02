import { PrismaModule } from '@common/prisma/prisma.module';
import { Module } from '@nestjs/common';

import { AwsModule } from '../aws/aws.module';

import { GameExpiryService } from './game-expiry.service';
import { GameRestateEndpointService } from './game-restate-endpoint.service';
import { GameSessionOrchestratorService } from './game-session-orchestrator.service';
import { GameSessionRestateService } from './game-session-restate.service';
import { GameController } from './game.controller';
import { GameService } from './game.service';

@Module({
    imports: [AwsModule, PrismaModule],
    controllers: [GameController],
    providers: [
        GameService,
        GameExpiryService,
        GameRestateEndpointService,
        GameSessionRestateService,
        GameSessionOrchestratorService,
    ],
    exports: [GameService],
})
export class GameModule {}
