import { BadRequestException } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { WalletLedgerService } from './ledger/ledger.service';
import { EventBusService } from '../events/event-bus.service';
import * as crypto from 'crypto';

describe('PaymentGatewayService (Webhook Engine & Idempotency)', () => {
  let service: PaymentGatewayService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockLedger: any;
  let mockEvents: any;
  let redisStore: Map<string, string>;

  const RAZORPAY_SECRET = 'test-razorpay-webhook-secret-key-123';
  const CASHFREE_SECRET = 'test-cashfree-webhook-secret-key-456';

  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = RAZORPAY_SECRET;
    process.env.CASHFREE_WEBHOOK_SECRET = CASHFREE_SECRET;

    redisStore = new Map();

    mockPrisma = {
      transaction: {
        findFirst: jest.fn(),
      },
    };

    mockRedis = {
      get: jest.fn(async (key: string) => redisStore.get(key) || null),
      set: jest.fn(async (key: string, val: string) => {
        redisStore.set(key, val);
      }),
      del: jest.fn(async (key: string) => {
        redisStore.delete(key);
      }),
      setnx: jest.fn(async (key: string, val: string) => {
        if (redisStore.has(key)) return 0;
        redisStore.set(key, val);
        return 1;
      }),
      expire: jest.fn().mockResolvedValue(true),
    };

    mockLedger = {
      settleDeposit: jest.fn().mockResolvedValue({
        applied: true,
        amount: 500,
        transactionId: 'tx-dep-1',
        userId: 'user-1',
        balanceAfter: 500,
      }),
      failDeposit: jest.fn().mockResolvedValue({
        applied: true,
        amount: 500,
        transactionId: 'tx-dep-failed',
        userId: 'user-1',
      }),
    };

    mockEvents = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    service = new PaymentGatewayService(
      mockPrisma as unknown as PrismaService,
      mockRedis as unknown as RedisService,
      mockLedger as unknown as WalletLedgerService,
      mockEvents as unknown as EventBusService,
    );
  });

  describe('Razorpay HMAC SHA-256 Webhook Verification', () => {
    it('successfully verifies and processes valid Razorpay payment.captured webhook', async () => {
      const payload = {
        event: 'payment.captured',
        event_id: 'evt_rzp_123',
        payload: {
          payment: {
            entity: {
              id: 'pay_ABC123',
              order_id: 'order_XYZ456',
              amount: 50000,
            },
          },
        },
      };

      const validSignature = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');

      const result = await service.handleWebhook(payload, validSignature);
      expect(result).toEqual({ received: true });
      expect(mockLedger.settleDeposit).toHaveBeenCalledWith('order_XYZ456', 'pay_ABC123');
    });

    it('rejects forged Razorpay signature with BadRequestException', async () => {
      const payload = { event: 'payment.captured' };
      const invalidSignature = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(JSON.stringify(payload))
        .digest('hex');

      await expect(service.handleWebhook(payload, invalidSignature)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockLedger.settleDeposit).not.toHaveBeenCalled();
    });

    it('safely rejects malformed signature length without crashing timingSafeEqual', async () => {
      const payload = { event: 'payment.captured' };
      await expect(service.handleWebhook(payload, 'short-sig')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Cashfree HMAC SHA-256 Webhook Verification', () => {
    it('successfully verifies Cashfree base64 signature and credits deposit', async () => {
      const timestamp = '1730000000';
      const body = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: { order_id: 'cf_order_789' },
          payment: { cf_payment_id: 'cf_pay_999' },
        },
      };
      const rawPayload = JSON.stringify(body);
      const signatureData = `${timestamp}${rawPayload}`;
      const validSignature = crypto
        .createHmac('sha256', CASHFREE_SECRET)
        .update(signatureData)
        .digest('base64');

      const result = await service.handleCashfreeWebhook(body, validSignature, timestamp);
      expect(result).toEqual({ received: true });
      expect(mockLedger.settleDeposit).toHaveBeenCalledWith('cf_order_789', 'cf_pay_999');
    });

    it('successfully verifies Cashfree hex signature and credits deposit', async () => {
      const body = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: { order_id: 'cf_order_hex_1' },
          payment: { cf_payment_id: 'cf_pay_hex_2' },
        },
      };
      const rawPayload = JSON.stringify(body);
      const validHexSignature = crypto
        .createHmac('sha256', CASHFREE_SECRET)
        .update(rawPayload)
        .digest('hex');

      const result = await service.handleCashfreeWebhook(body, validHexSignature);
      expect(result).toEqual({ received: true });
      expect(mockLedger.settleDeposit).toHaveBeenCalledWith('cf_order_hex_1', 'cf_pay_hex_2');
    });

    it('rejects forged Cashfree signature with BadRequestException', async () => {
      const body = { type: 'PAYMENT_SUCCESS_WEBHOOK' };
      const forgedSig = Buffer.from('forged-signature-base-64-length-safe==').toString('base64');

      await expect(service.handleCashfreeWebhook(body, forgedSig)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockLedger.settleDeposit).not.toHaveBeenCalled();
    });
  });

  describe('Idempotency Engine (payment_webhook_events deduplication)', () => {
    it('discards duplicate webhook delivery without duplicate wallet credit', async () => {
      const payload = {
        event: 'payment.captured',
        event_id: 'evt_duplicate_test_1',
        payload: {
          payment: {
            entity: {
              id: 'pay_DUP1',
              order_id: 'order_DUP1',
            },
          },
        },
      };

      const validSignature = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');

      // First webhook delivery
      const firstResult = await service.handleWebhook(payload, validSignature);
      expect(firstResult).toEqual({ received: true });
      expect(mockLedger.settleDeposit).toHaveBeenCalledTimes(1);

      // Second identical webhook delivery (retried by gateway)
      const secondResult = await service.handleWebhook(payload, validSignature);
      expect(secondResult).toEqual({ received: true, duplicate: true });

      // Third identical webhook delivery
      const thirdResult = await service.handleWebhook(payload, validSignature);
      expect(thirdResult).toEqual({ received: true, duplicate: true });

      // Verify settleDeposit was NOT called again
      expect(mockLedger.settleDeposit).toHaveBeenCalledTimes(1);
    });
  });
});
