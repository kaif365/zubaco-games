import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
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

  // M10 — checkout/idempotency window for deposit orders. A retried deposit intent
  // within this window reuses the same OPEN order; after it the order is cleaned
  // up by WalletCleanupService (>30min) and a fresh intent may mint a new order.
  private static readonly DEPOSIT_ORDER_WINDOW_SECONDS = 900;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly ledger: WalletLedgerService,
    private readonly events: EventBusService,
  ) {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  }

  // ─── CREATE ORDER ─────────────────────────────────────────────

  async createDepositOrder(userId: string, amountInr: number, idempotencyKey?: string) {
    if (amountInr < 10) {
      throw new BadRequestException('Minimum deposit is ₹10');
    }
    if (amountInr > 100000) {
      throw new BadRequestException('Maximum deposit is ₹1,00,000');
    }

    const amountPaise = Math.round(amountInr * 100);
    const currency = 'INR';

    // M10 — deposit-order idempotency is GUARANTEED for EVERY client, not only
    // those that supply an Idempotency-Key. When the header is absent the server
    // derives a deterministic key from the logical deposit intent
    // (userId + amountPaise + currency), so a header-less, concurrent or post-crash
    // retry of the same intent collapses onto the SAME open Razorpay order instead
    // of minting a second one. The Redis map is the fast path; an open-PENDING DB
    // lookup is the durable backstop that survives a Redis flush.
    const effectiveKey = idempotencyKey
      ? `client:${idempotencyKey}`
      : `auto:${crypto
          .createHash('sha256')
          .update(`${userId}|${amountPaise}|${currency}`)
          .digest('hex')
          .slice(0, 32)}`;
    const idemMapKey = `deposit:order:idem:${userId}:${effectiveKey}`;
    const window = PaymentGatewayService.DEPOSIT_ORDER_WINDOW_SECONDS;

    // Fast path — a prior order for this exact intent is mapped and still OPEN.
    const mapped = await this.redis.get(idemMapKey);
    if (mapped) {
      const replay = await this.replayDepositOrder(userId, mapped);
      if (replay) return replay;
    }

    // Concurrency guard — collapse a simultaneous double-submit of the same intent
    // onto a single order. The losing caller re-reads the now-mapped order.
    const gotLock = await this.redis.setnx(`${idemMapKey}:lock`, '1');
    if (!gotLock) {
      const mappedNow = await this.redis.get(idemMapKey);
      if (mappedNow) {
        const replay = await this.replayDepositOrder(userId, mappedNow);
        if (replay) return replay;
      }
      throw new ConflictException('Deposit order creation already in progress');
    }
    await this.redis.expire(`${idemMapKey}:lock`, 30);

    try {
      // Durable backstop — even if Redis was flushed, reuse an existing OPEN
      // (PENDING) deposit order for this exact intent rather than minting a new one.
      const reusable = await this.findReusableOpenDeposit(userId, amountInr, window);
      if (reusable) {
        await this.redis.set(idemMapKey, reusable.order_id, window);
        return reusable;
      }

      // Create Razorpay order via API
      const order = await this.createRazorpayOrder(
        amountPaise,
        currency,
        { user_id: userId, type: 'deposit' },
        effectiveKey,
      );

      // M5 — the PENDING deposit row is registered through the authoritative ledger
      // (single writer, idempotent per order id, fully audited). No direct
      // transaction write remains in the gateway.
      await this.ledger.createPendingDeposit({
        userId,
        amount: amountInr,
        referenceId: order.id,
        metadata: { razorpay_order_id: order.id, amount_paise: amountPaise },
      });

      await this.redis.set(idemMapKey, order.id, window);

      return {
        order_id: order.id,
        amount: amountInr,
        currency,
        key_id: this.keyId,
        // Client uses this to open Razorpay checkout
      };
    } finally {
      // Release the in-flight guard; the map (not the lock) is the durable record.
      await this.redis.del(`${idemMapKey}:lock`);
    }
  }

  /**
   * Return a replay response for a previously-mapped deposit order, but ONLY while
   * it is still OPEN (PENDING). A COMPLETED/FAILED/CANCELLED order is NOT replayed,
   * so a user may legitimately deposit the same amount again once the prior intent
   * has resolved.
   */
  private async replayDepositOrder(userId: string, orderId: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { reference_id: orderId, type: 'DEPOSIT', user_id: userId },
    });
    if (!tx || tx.status !== 'PENDING') return null;
    return {
      order_id: orderId,
      amount: Number(tx.amount),
      currency: 'INR',
      key_id: this.keyId,
      idempotent_replay: true,
    };
  }

  /**
   * Durable idempotency backstop. Find the most recent OPEN (PENDING) deposit order
   * for this exact intent (user + amount) created within the checkout window. Used
   * when the Redis map is unavailable (e.g. after a flush) so a retry still returns
   * the existing order instead of creating a second one.
   */
  private async findReusableOpenDeposit(userId: string, amountInr: number, windowSeconds: number) {
    const windowStart = new Date(Date.now() - windowSeconds * 1000);
    const tx = await this.prisma.transaction.findFirst({
      where: {
        user_id: userId,
        type: 'DEPOSIT',
        status: 'PENDING',
        amount: amountInr,
        created_at: { gte: windowStart },
      },
      orderBy: { created_at: 'desc' },
    });
    if (!tx || !tx.reference_id) return null;
    return {
      order_id: tx.reference_id,
      amount: Number(tx.amount),
      currency: 'INR',
      key_id: this.keyId,
      idempotent_replay: true,
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
      // M5 — failure is routed through the authoritative ledger (atomic
      // PENDING -> FAILED claim, audited, idempotent on repeated webhooks).
      const result = await this.ledger.failDeposit(
        orderId,
        payload.error_description || 'Payment failed at gateway',
      );
      if (result.applied) {
        await this.events.publish(
          PlatformEventType.DEPOSIT_FAILED,
          {
            reference_id: orderId,
            amount: result.amount,
            transaction_id: result.transactionId,
            reason: 'payment.failed',
          },
          result.userId,
          `deposit.failed:${orderId}`,
        );
      }
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
        transaction.id,
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
    transactionId: string,
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        // M6 — deterministic idempotency key (the withdrawal transaction id).
        // A crash-retry re-sends the SAME key, so RazorpayX returns the existing
        // payout instead of creating a duplicate external transfer.
        'X-Payout-Idempotency': transactionId,
      },
      body: JSON.stringify({
        account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
        fund_account_id: fund.id,
        amount: amountPaise,
        currency: 'INR',
        mode: bankDetail.account_type === 'UPI' ? 'UPI' : 'IMPS',
        purpose: 'payout',
        queue_if_low_balance: true,
        // M6 — stable, deterministic external reference (was Date.now()-based).
        reference_id: transactionId,
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

  private async createRazorpayOrder(amountPaise: number, currency: string, notes: any, idempotencyKey?: string): Promise<RazorpayOrder> {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

    const body: Record<string, unknown> = {
      amount: amountPaise,
      currency,
      notes,
    };
    // M7 — carry the client idempotency token as the Razorpay receipt for
    // traceability; our Redis idempotency map is the authoritative dedup guard
    // (a retried request short-circuits before this call is ever reached).
    if (idempotencyKey) {
      body.receipt = `idem_${idempotencyKey}`.slice(0, 40);
    }

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
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
