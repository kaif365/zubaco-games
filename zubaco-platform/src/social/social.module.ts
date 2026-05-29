import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { ChallengeService } from './challenge.service';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [WalletModule, NotificationModule],
  controllers: [SocialController],
  providers: [SocialService, ChallengeService],
  exports: [SocialService, ChallengeService],
})
export class SocialModule {}
