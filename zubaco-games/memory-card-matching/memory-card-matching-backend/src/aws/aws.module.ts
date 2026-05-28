import { Module } from "@nestjs/common";

import { S3StorageService } from "./s3-storage.service";
import { SnsService } from "./sns.service";
import { SqsService } from "./sqs.service";

/**
 * Module for AWS-integrated infrastructure services.
 */
@Module({
  providers: [S3StorageService, SnsService, SqsService],
  exports: [S3StorageService, SnsService, SqsService],
})
export class AwsModule {}
