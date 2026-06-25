import { Module } from '@nestjs/common';

import { S3Service } from './s3.service';
import { SnsService } from './sns.service';
import { SqsService } from './sqs.service';

@Module({
    providers: [SqsService, SnsService, S3Service],
    exports: [SqsService, SnsService, S3Service],
})
export class AwsModule {}
