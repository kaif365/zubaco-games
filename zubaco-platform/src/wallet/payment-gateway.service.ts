import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WalletLedgerService } from './ledger/ledger.service';
import { EventBusService } from '../events/event-bus.service';
import { PlatformEventType } from '../events/event.types';
import * as crypto from 'crypto';

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

@Injectable()
export class PaymentGatewayService {
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: WalletLedgerService,
    private readonly events: EventBusService,
  ) {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  }

  // ─── CREATE ORDER ─────────────────────────────────────────────

  async createDepositOrder(userId: string, amountInr: number) {
    if (amountInr < 10) {
      throw new BadRequestException('Minimum deposit is ₹10');
    }
    if (amountInr > 100000) {
      throw new BadRequestException('Maximum deposit is ₹1,00,000');
    }

    const amountPaise = Math.round(amountInr * 100);

    // Create Razorpay order via API
    const order = await this.createRazorpayOrder(amountPaise, 'INR', {
      user_id: userId,
      type: 'deposit',
    });

    // Store pending transaction
    const wallet = await this.prisma.wallet.findUnique({ where: { user_id: userId } });
    const currentBalance = wallet ? Number(wallet.balance) : 0;

    await this.prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'DEPOSIT',
        amount: amountInr,
        balance_after: currentBalance + amountInr,
        status: 'PENDING',
        reference_id: order.id,
        description: `Deposit ₹${amountInr}`,
        metadata: { razorpay_order_id: order.id, amount_paise: amountPaise },
      },
    });

    return {
      order_id: order.id,
      amount: amountInr,
      currency: 'INR',
      key_id: this.keyId,
      // Client uses this to open Razorpay checkout
    };
  }

  // ─── VERIFY PAYMENT ────────────────────────────────────────────

  async verifyPayment(orderId: string, paymentId: string, signature: string) {
    // Verify signature using timing-safe comparison
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
      throw new BadRequestException('Invalid payment signature');
    }

    // Verify actual payment amount from Razorpay (defense-in-depth)
    const payment = await this.fetchRazorpayPayment(paymentId);
    const transaction = await this.prisma.transaction.findFirst({
      where: { reference_id: orderId, status: 'PENDING', type: 'DEPOSIT' },
    });

    if (transaction) {
      const expectedPaise = Math.round(Number(transaction.amount) * 100);
      if (payment.amount !== expectedPaise) {
        throw new BadRequestException('Payment amount mismatch');
      }
    }

    // Atomically claim the transaction (prevents double-credit from webhook + verify race)
    return this.creditDepositAtomically(orderId, paymentId);
  }

  // ─── WEBHOOK HANDLER ───────────────────────────────────────────

  async handleWebhook(body: any, signature: string) {
    // Verify webhook signature using timing-safe comparison
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = body.event;
    const payload = body.payload?.payment?.entity;

    if (event === 'payment.captured' && payload) {
      await this.creditDepositAtomically(payload.order_id, payload.id);
    }

    if (event === 'payment.failed' && payload) {
      const orderId = payload.order_id;
      await this.prisma.transaction.updateMany({
        where: { reference_id: orderId, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
    }

    return { received: true };
  }

  // ─── ATOMIC CREDIT (prevents double-credit race) ──────────────

  /**
   * Deposit settlement is delegated to the authoritative wallet ledger
   * (`settleDeposit`), which atomically claims the PENDING DEPOSIT row
   * (PENDING -> COMPLETED, single writer) and credits the cash bucket with a full
   * audit trail. The claim is the idempotency guard, so a webhook + verify race
   * cannot double-credit. WALLET_CREDITED is published once, only on the winning
   * claim, keyed deterministically so duplicate publishes are suppressed.
   */
  private async creditDepositAtomically(orderId: string, paymentId: string) {
    const result = await this.ledger.settleDeposit(orderId, paymentId);
    if (!result.applied) {
      // Already settled by the other of {verify, webhook}, or cancelled — not an error.
      return { success: true, already_processed: true };
    }
    await this.events.publish(
      PlatformEventType.WALLET_CREDITED,
      {
        amount: result.amount,
        source: 'deposit',
        reference_id: orderId,
        transaction_id: result.transactionId,
        balance_after: result.balanceAfter,
      },
      result.userId,
      `wallet.credited:deposit:${orderId}`,
    );
    return { success: true, amount: result.amount };
  }

  // ─── PAYOUT via RazorpayX ──────────────────────────────────────

  async processWithdrawal(transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, type: 'WITHDRAWAL', status: 'PENDING' },
      include: { user: { select: { id: true } } },
    });

    if (!transaction) {
      throw new BadRequestException('Withdrawal transaction not found');
    }

    // Get user's primary bank detail
    const bankDetail = await this.prisma.bankDetail.findFirst({
      where: { user_id: transaction.user_id, is_primary: true, verified: true },
    });

    if (!bankDetail) {
      throw new BadRequestException('No verified bank detail found');
    }

    // Razorpay flow is unchanged. The payout itself is the only step that can
    // fail; isolate it so a failure (and only a failure) triggers the ledger
    // reversal/refund.
    let payoutResult: { id: string; status: string };
    try {
      payoutResult = await this.createRazorpayXPayout(
        transaction.user_id,
        Number(transaction.amount),
        bankDetail,
      );
    } catch (error: any) {
      const reversed = await this.ledger.failWithdrawal(transactionId, error.message);
      if (reversed.applied) {
        await this.events.publish(
          PlatformEventType.PAYOUT_REVERSED,
          { transaction_id: transactionId, amount: Number(transaction.amount), error: error.message },
          transaction.user_id,
          `payout.reversed:${transactionId}`,
        );
      }
      throw new BadRequestException(`Payout failed: ${error.message}`);
    }

    // Authoritative settlement (PENDING -> COMPLETED, no balance movement).
    const settled = await this.ledger.completeWithdrawal(transactionId, {
      payoutId: payoutResult.id,
      payoutStatus: payoutResult.status,
    });
    if (settled.applied) {
      await this.events.publish(
        PlatformEventType.PAYOUT_SETTLED,
        { transaction_id: transactionId, payout_id: payoutResult.id, amount: Number(transaction.amount) },
        transaction.user_id,
        `payout.settled:${transactionId}`,
      );
    }

    return { success: true, payout_id: payoutResult.id };
  }

  /**
   * Create a payout via RazorpayX API.
   * Supports both bank account (NEFT/IMPS) and UPI payouts.
   */
  private async createRazorpayXPayout(
    userId: string,
    amountInr: number,
    bankDetail: { account_type: string; account_number?: string | null; ifsc_code?: string | null; upi_id?: string | null; account_holder: string },
  ): Promise<{ id: string; status: string }> {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const amountPaise = Math.round(amountInr * 100);

    let fundAccount: any;
    if (bankDetail.account_type === 'BANK_ACCOUNT') {
      fundAccount = {
        account_type: 'bank_account',
        bank_account: {
          name: bankDetail.account_holder,
          ifsc: bankDetail.ifsc_code,
          account_number: bankDetail.account_number,
        },
      };
    } else {
      fundAccount = {
        account_type: 'vpa',
        vpa: { address: bankDetail.upi_id },
      };
    }

    // Create contact + fund account + payout in one flow
    const contactRes = await fetch('https://api.razorpay.com/v1/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        name: bankDetail.account_holder,
        type: 'customer',
        reference_id: userId,
      }),
    });

    if (!contactRes.ok) {
      throw new Error('Failed to create RazorpayX contact');
    }
    const contact = await contactRes.json() as { id: string };

    // Create fund account
    const fundRes = await fetch('https://api.razorpay.com/v1/fund_accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        contact_id: contact.id,
        ...fundAccount,
      }),
    });

    if (!fundRes.ok) {
      throw new Error('Failed to create fund account');
    }
    const fund = await fundRes.json() as { id: string };

    // Create payout
    const payoutRes = await fetch('https://api.razorpay.com/v1/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
        fund_account_id: fund.id,
        amount: amountPaise,
        currency: 'INR',
        mode: bankDetail.account_type === 'UPI' ? 'UPI' : 'IMPS',
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: `wd_${userId}_${Date.now()}`,
        narration: 'Zubaco Withdrawal',
      }),
    });

    if (!payoutRes.ok) {
      const errBody = await payoutRes.text();
      throw new Error(`Payout creation failed: ${errBody}`);
    }

    return payoutRes.json() as Promise<{ id: string; status: string }>;
  }

  // ─── RAZORPAY API CALL ─────────────────────────────────────────

  private async createRazorpayOrder(amountPaise: number, currency: string, notes: any): Promise<RazorpayOrder> {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency,
        notes,
      }),
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to create payment order');
    }

    return response.json() as Promise<RazorpayOrder>;
  }

  private async fetchRazorpayPayment(paymentId: string): Promise<{ amount: number; status: string }> {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to fetch payment details from Razorpay');
    }

    return response.json() as Promise<{ amount: number; status: string }>;
  }
}
