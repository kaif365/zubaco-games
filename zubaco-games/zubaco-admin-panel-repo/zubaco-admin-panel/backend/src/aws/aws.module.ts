import { Module } from '@nestjs/common';

import { SnsService } from './sns.service';
import { SqsService } from './sqs.service';

@Module({
    providers: [SqsService, SnsService],
    exports: [SqsService, SnsService],
})
export class AwsModule {}
