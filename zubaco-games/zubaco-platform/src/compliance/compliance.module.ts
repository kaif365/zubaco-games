import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { AgeVerificationService } from './age-verification.service';
import { GeoFencingGuard } from './geo-fencing.guard';
import { TdsService } from './tds.service';
import { GstService } from './gst.service';
import { LegalController } from './legal.controller';

@Module({
  controllers: [ComplianceController, LegalController],
  providers: [AgeVerificationService, GeoFencingGuard, TdsService, GstService],
  exports: [AgeVerificationService, GeoFencingGuard, TdsService, GstService],
})
export class ComplianceModule {}
