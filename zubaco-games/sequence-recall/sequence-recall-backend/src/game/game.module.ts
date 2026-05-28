import { Module } from '@nestjs/common';

import { AwsModule } from '../aws/aws.module';
import { PrismaModule } from '../common/prisma/prisma.module';

import { GameAntiCheatService } from './game-anti-cheat.service';
import { GameConfigService } from './game-config.service';
import { GameExpiryService } from './game-expiry.service';
import { GameRestateEndpointService } from './game-restate-endpoint.service';
import { GameSessionRestateService } from './game-session-restate.service';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';

@Module({
    imports: [PrismaModule, AwsModule],
    controllers: [GameController],
    providers: [
        GameService,
        GameAntiCheatService,
        GameConfigService,
        GameExpiryService,
        GameSessionRestateService,
        GameRestateEndpointService,
        GameGateway,
    ],
    exports: [GameConfigService],
})
export class GameModule {}
