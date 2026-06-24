import { Module } from '@nestjs/common';

import { AwsModule } from '../aws/aws.module';

import { CheatFlagsController } from './cheat-flags.controller';
import { CheatFlagsService } from './cheat-flags.service';

@Module({
    imports: [AwsModule],
    controllers: [CheatFlagsController],
    providers: [CheatFlagsService],
})
export class CheatFlagsModule {}
