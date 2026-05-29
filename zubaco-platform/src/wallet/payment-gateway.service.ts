import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
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

  constructor(private readonly prisma: PrismaService) {
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

  private async creditDepositAtomically(orderId: string, paymentId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Atomically claim: only update if still PENDING (single writer wins)
      const updated = await tx.transaction.updateMany({
        where: { reference_id: orderId, status: 'PENDING', type: 'DEPOSIT' },
        data: { status: 'COMPLETED' },
      });

      if (updated.count === 0) {
        // Already processed (by webhook or verify), not an error
        return { success: true, already_processed: true };
      }

      const transaction = await tx.transaction.findFirst({
        where: { reference_id: orderId, type: 'DEPOSIT' },
      });

      if (!transaction) {
        throw new BadRequestException('Transaction not found');
      }

      // Credit wallet atomically
      await tx.wallet.upsert({
        where: { user_id: transaction.user_id },
        create: { user_id: transaction.user_id, balance: transaction.amount },
        update: { balance: { increment: transaction.amount } },
      });

      // Update metadata with payment ID
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { metadata: { ...(transaction.metadata as any), razorpay_payment_id: paymentId } },
      });

      return { success: true, amount: Number(transaction.amount) };
    });
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

    try {
      const payoutResult = await this.createRazorpayXPayout(
        transaction.user_id,
        Number(transaction.amount),
        bankDetail,
      );

      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          metadata: {
            ...(transaction.metadata as any),
            payout_id: payoutResult.id,
            payout_status: payoutResult.status,
          },
        },
      });

      return { success: true, payout_id: payoutResult.id };
    } catch (error: any) {
      // Mark as failed but don't lose the transaction
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'FAILED',
          metadata: { ...(transaction.metadata as any), error: error.message },
        },
      });

      // Refund wallet balance
      await this.prisma.wallet.update({
        where: { user_id: transaction.user_id },
        data: { balance: { increment: transaction.amount } },
      });

      throw new BadRequestException(`Payout failed: ${error.message}`);
    }
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
