import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { AwsModule } from "../aws/aws.module";
import { SqsConsumerService } from "../aws/sqs-consumer.service";

@Module({
  imports: [AwsModule, AdminModule],
  providers: [SqsConsumerService],
})
export class EventsModule {}
