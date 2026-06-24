import { Controller, Get, Post, Delete, Body, Param, Query, Headers, UseGuards, RawBodyRequest, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WalletService } from './wallet.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { KycService } from './kyc.service';
import { BankDetailService } from './bank-detail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeoFencingGuard } from '../compliance/geo-fencing.guard';
import { RazorpayWebhookGuard } from './guards/razorpay-webhook.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateDepositOrderDto, VerifyDepositDto, WithdrawDto, ConfirmWithdrawalDto } from './dto/wallet.dto';
import { KycDocType, BankAccountType } from '.prisma/client';

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly kycService: KycService,
    private readonly bankDetailService: BankDetailService,
  ) {}

  // ─── WALLET ENDPOINTS ──────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  async getWallet(@CurrentUser() userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactions(
    @CurrentUser() userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.walletService.getTransactions(userId, page || 1, limit || 20);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 3600000, limit: 5 } }) // 5 per hour
  async withdraw(@CurrentUser() userId: string, @Body() dto: WithdrawDto) {
    return this.walletService.initiateWithdrawal(userId, dto.amount);
  }

  @Post('withdraw/confirm')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  async confirmWithdrawal(@CurrentUser() userId: string, @Body() dto: ConfirmWithdrawalDto) {
    return this.walletService.confirmWithdrawal(userId, dto.withdrawal_id, dto.otp);
  }

  // ─── PAYMENT ENDPOINTS ─────────────────────────────────────────

  @Post('deposit/create-order')
  @UseGuards(JwtAuthGuard, GeoFencingGuard)
  @Throttle({ default: { ttl: 3600000, limit: 10 } }) // 10 per hour
  async createDepositOrder(@CurrentUser() userId: string, @Body() dto: CreateDepositOrderDto) {
    return this.paymentGateway.createDepositOrder(userId, dto.amount);
  }

  @Post('deposit/verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@Body() dto: VerifyDepositDto) {
    return this.paymentGateway.verifyPayment(dto.order_id, dto.payment_id, dto.signature);
  }

  @Post('webhook/razorpay')
  @UseGuards(RazorpayWebhookGuard)
  async razorpayWebhook(@Body() body: any, @Headers('x-razorpay-signature') signature: string) {
    return this.paymentGateway.handleWebhook(body, signature);
  }

  // ─── KYC ENDPOINTS ─────────────────────────────────────────────

  @Get('kyc')
  @UseGuards(JwtAuthGuard)
  async getKycStatus(@CurrentUser() userId: string) {
    return this.kycService.getKycStatus(userId);
  }

  @Post('kyc/submit')
  @UseGuards(JwtAuthGuard)
  async submitKycDocument(
    @CurrentUser() userId: string,
    @Body() body: { document_type: KycDocType; document_url: string; document_number?: string },
  ) {
    return this.kycService.submitDocument(userId, body.document_type, body.document_url, body.document_number);
  }

  // ─── BANK DETAIL ENDPOINTS ─────────────────────────────────────

  @Get('bank-details')
  @UseGuards(JwtAuthGuard)
  async getBankDetails(@CurrentUser() userId: string) {
    return this.bankDetailService.getBankDetails(userId);
  }

  @Post('bank-details')
  @UseGuards(JwtAuthGuard)
  async addBankDetail(
    @CurrentUser() userId: string,
    @Body() body: { account_type: BankAccountType; account_holder: string; account_number?: string; ifsc_code?: string; upi_id?: string },
  ) {
    return this.bankDetailService.addBankAccount(userId, body);
  }

  @Post('bank-details/:id/primary')
  @UseGuards(JwtAuthGuard)
  async setPrimaryBankDetail(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.bankDetailService.setPrimary(userId, id);
  }

  @Delete('bank-details/:id')
  @UseGuards(JwtAuthGuard)
  async deleteBankDetail(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.bankDetailService.deleteBankDetail(userId, id);
  }
}
