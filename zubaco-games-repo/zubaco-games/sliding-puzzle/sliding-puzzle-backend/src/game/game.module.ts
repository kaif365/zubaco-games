import { Module } from '@nestjs/common';

import { AwsModule } from '../aws/aws.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

import { GameExpiryService } from './game-expiry.service';
import { GameRestateEndpointService } from './game-restate-endpoint.service';
import { GameSessionRestateService } from './game-session-restate.service';
import { GameController } from './game.controller';
import { GameService } from './game.service';

@Module({
    imports: [AwsModule, PrismaModule, RedisModule],
    controllers: [GameController],
    providers: [
        GameService,
        GameExpiryService,
        GameRestateEndpointService,
        GameSessionRestateService,
    ],
})
export class GameModule {}
