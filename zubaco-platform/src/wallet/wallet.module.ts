import { Module, forwardRef } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { KycService } from './kyc.service';
import { BankDetailService } from './bank-detail.service';
import { WalletCleanupService } from './wallet-cleanup.service';
import { AuthModule } from '../auth/auth.module';
import { ComplianceModule } from '../compliance/compliance.module';

@Module({
  imports: [forwardRef(() => AuthModule), ComplianceModule],
  controllers: [WalletController],
  providers: [WalletService, PaymentGatewayService, KycService, BankDetailService, WalletCleanupService],
  exports: [WalletService, PaymentGatewayService, KycService, BankDetailService],
})
export class WalletModule {}
