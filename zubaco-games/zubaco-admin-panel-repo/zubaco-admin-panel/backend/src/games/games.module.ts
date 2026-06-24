import { Module } from '@nestjs/common';

import { AwsModule } from '../aws/aws.module';

import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
    imports: [AwsModule],
    controllers: [GamesController],
    providers: [GamesService],
})
export class GamesModule {}
