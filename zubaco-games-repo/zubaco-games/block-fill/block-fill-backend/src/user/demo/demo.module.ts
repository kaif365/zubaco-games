import { PrismaModule } from '@common/prisma/prisma.module';
import { Module } from '@nestjs/common';

import { GameModule } from '../../game/game.module';

import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';

@Module({
    imports: [PrismaModule, GameModule],
    controllers: [DemoController],
    providers: [DemoService],
})
export class DemoModule {}
