import { Module } from '@nestjs/common';

import { AwsModule } from '../aws/aws.module';

import { StagesController } from './stages.controller';
import { StagesService } from './stages.service';

@Module({
    imports: [AwsModule],
    controllers: [StagesController],
    providers: [StagesService],
})
export class StagesModule {}
