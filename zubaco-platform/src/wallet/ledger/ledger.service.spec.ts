import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '.prisma/client';
import { WalletLedgerService } from './ledger.service';
import { FinancialOperation, LedgerRequest } from './ledger.types';

describe('WalletLedgerService — Concurrency & Financial Ledger Audit', () => {
  let service: WalletLedgerService;
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      setnx: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
    };

    mockPrisma = {
      transaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      wallet: {
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => {
        const mockTx = {
          $queryRawUnsafe: jest.fn().mockResolvedValue([
            {
              id: 'wallet-1',
              user_id: 'user-100',
              balance: new Prisma.Decimal('100.00'),
              bonus_balance: new Prisma.Decimal('20.00'),
            },
          ]),
          wallet: {
            update: jest.fn().mockResolvedValue({}),
          },
          transaction: {
            create: jest.fn().mockImplementation((args) => ({
              id: 'tx-created-1',
              ...args.data,
            })),
          },
        };
        return cb(mockTx);
      }),
    };

    service = new WalletLedgerService(mockPrisma as any, mockRedis as any);
  });

  describe('4.2.1. Idempotency Key Guarantees', () => {
    it('requires an idempotency key and positive amount', async () => {
      await expect(
        service.post({
          userId: 'user-1',
          operation: FinancialOperation.DEPOSIT_CREDIT,
          amount: 0,
          idempotencyKey: 'key-1',
          reason: 'zero test',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.post({
          userId: 'user-1',
          operation: FinancialOperation.DEPOSIT_CREDIT,
          amount: 50,
          idempotencyKey: '',
          reason: 'empty key',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects concurrent in-flight requests holding the same Redis mutex', async () => {
      mockRedis.setnx.mockResolvedValueOnce(0); // Lock already held

      await expect(
        service.post({
          userId: 'user-1',
          operation: FinancialOperation.DEPOSIT_CREDIT,
          amount: 50,
          idempotencyKey: 'concurrent-key',
          reason: 'concurrent test',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('short-circuits and returns duplicate:true if transaction already committed', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValueOnce({
        id: 'tx-existing',
        ledger_key: 'committed-key',
        balance_after: new Prisma.Decimal('150.00'),
      });

      const res = await service.post({
        userId: 'user-1',
        operation: FinancialOperation.DEPOSIT_CREDIT,
        amount: 50,
        idempotencyKey: 'committed-key',
        reason: 'retry test',
      });

      expect(res.applied).toBe(false);
      expect(res.duplicate).toBe(true);
      expect(res.transactionId).toBe('tx-existing');
      expect(res.balanceAfter).toBe(150);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('4.2.2. Row-Level Locking & Balance Atomic Update', () => {
    it('executes SELECT FOR UPDATE inside Prisma transaction and updates wallet balance', async () => {
      let executedQuery = '';
      mockPrisma.$transaction.mockImplementationOnce(async (cb: any) => {
        const mockTx = {
          $queryRawUnsafe: jest.fn().mockImplementation((query, ...args) => {
            executedQuery = query;
            return [
              {
                id: 'wallet-1',
                user_id: 'user-100',
                balance: new Prisma.Decimal('100.00'),
                bonus_balance: new Prisma.Decimal('0.00'),
              },
            ];
          }),
          wallet: { update: jest.fn() },
          transaction: {
            create: jest.fn().mockResolvedValue({ id: 'tx-new' }),
          },
        };
        return cb(mockTx);
      });

      const req: LedgerRequest = {
        userId: 'user-100',
        operation: FinancialOperation.DEPOSIT_CREDIT,
        amount: 50,
        idempotencyKey: 'dep-key-1',
        reason: 'Deposit added',
      };

      const result = await service.post(req);

      expect(result.applied).toBe(true);
      expect(result.duplicate).toBe(false);
      expect(executedQuery).toContain('FOR UPDATE');
      expect(result.balanceAfter).toBe(150);
    });

    it('rejects debit operations if balance is insufficient', async () => {
      mockPrisma.$transaction.mockImplementationOnce(async (cb: any) => {
        const mockTx = {
          $queryRawUnsafe: jest.fn().mockResolvedValue([
            {
              id: 'wallet-1',
              user_id: 'user-100',
              balance: new Prisma.Decimal('10.00'),
              bonus_balance: new Prisma.Decimal('0.00'),
            },
          ]),
          wallet: { update: jest.fn() },
          transaction: { create: jest.fn() },
        };
        return cb(mockTx);
      });

      const req: LedgerRequest = {
        userId: 'user-100',
        operation: FinancialOperation.ENTRY_FEE_DEBIT,
        amount: 50, // Available: 10
        idempotencyKey: 'debit-fail-key',
        reason: 'Entry fee',
      };

      await expect(service.post(req)).rejects.toThrow('Insufficient balance');
      expect(mockRedis.del).toHaveBeenCalled(); // Lock cleared on rollback
    });
  });

  describe('4.2.3. Entry Fee Bucket Splitting & Double-Spend Proof', () => {
    it('spends bonus bucket first, then cash bucket for entry fee', async () => {
      let updatedCash: any;
      let updatedBonus: any;

      mockPrisma.$transaction.mockImplementationOnce(async (cb: any) => {
        const mockTx = {
          $queryRawUnsafe: jest.fn().mockResolvedValue([
            {
              id: 'wallet-1',
              user_id: 'user-100',
              balance: new Prisma.Decimal('80.00'),
              bonus_balance: new Prisma.Decimal('20.00'),
            },
          ]),
          wallet: {
            update: jest.fn().mockImplementation((args) => {
              updatedCash = args.data.balance;
              updatedBonus = args.data.bonus_balance;
            }),
          },
          transaction: {
            create: jest.fn().mockResolvedValue({ id: 'tx-entry-1' }),
          },
        };
        return cb(mockTx);
      });

      // Entry fee = 30; Bonus has 20 -> spends all 20 bonus + 10 cash -> leaves cash: 70, bonus: 0
      const res = await service.debitEntryFee({
        userId: 'user-100',
        amount: 30,
        idempotencyKey: 'entry-key-1',
        reason: 'Tournament entry fee',
        seasonRef: 'season-season-1',
      });

      expect(res.applied).toBe(true);
      expect(Number(updatedBonus)).toBe(0);
      expect(Number(updatedCash)).toBe(70);
      expect(res.balanceAfter).toBe(70);
    });

    it('rejects entry fee when total combined (cash + bonus) is less than amount', async () => {
      mockPrisma.$transaction.mockImplementationOnce(async (cb: any) => {
        const mockTx = {
          $queryRawUnsafe: jest.fn().mockResolvedValue([
            {
              id: 'wallet-1',
              user_id: 'user-100',
              balance: new Prisma.Decimal('30.00'),
              bonus_balance: new Prisma.Decimal('10.00'),
            },
          ]),
          wallet: { update: jest.fn() },
          transaction: { create: jest.fn() },
        };
        return cb(mockTx);
      });

      await expect(
        service.debitEntryFee({
          userId: 'user-100',
          amount: 50, // 30 + 10 = 40 < 50
          idempotencyKey: 'entry-key-fail',
          reason: 'Tournament entry fee',
        }),
      ).rejects.toThrow('Insufficient balance for entry fee');
    });

    it('proves anti-double-spend: sequential transaction serialization rejects second debit', async () => {
      // Simulates two concurrent requests hitting the row lock.
      // Initial wallet balance = ₹50 cash, ₹0 bonus.
      let currentBalance = new Prisma.Decimal('50.00');

      const mockDbTransaction = async (amount: number, key: string) => {
        return service.debitEntryFee({
          userId: 'user-100',
          amount,
          idempotencyKey: key,
          reason: 'Tournament join',
        });
      };

      // When first request acquires lock, currentBalance is 50 -> succeeds, sets currentBalance to 0.
      mockPrisma.$transaction.mockImplementationOnce(async (cb: any) => {
        const mockTx = {
          $queryRawUnsafe: jest.fn().mockResolvedValue([
            {
              id: 'wallet-1',
              user_id: 'user-100',
              balance: currentBalance,
              bonus_balance: new Prisma.Decimal('0.00'),
            },
          ]),
          wallet: {
            update: jest.fn().mockImplementation(() => {
              currentBalance = new Prisma.Decimal('0.00');
            }),
          },
          transaction: {
            create: jest.fn().mockResolvedValue({ id: 'tx-req-1' }),
          },
        };
        return cb(mockTx);
      });

      // First request succeeds
      const req1 = await mockDbTransaction(50, 'double-spend-key-1');
      expect(req1.applied).toBe(true);
      expect(req1.balanceAfter).toBe(0);

      // When second request runs, it reads the updated row balance = ₹0 -> throws Insufficient balance!
      mockPrisma.$transaction.mockImplementationOnce(async (cb: any) => {
        const mockTx = {
          $queryRawUnsafe: jest.fn().mockResolvedValue([
            {
              id: 'wallet-1',
              user_id: 'user-100',
              balance: currentBalance, // Now 0
              bonus_balance: new Prisma.Decimal('0.00'),
            },
          ]),
          wallet: { update: jest.fn() },
          transaction: { create: jest.fn() },
        };
        return cb(mockTx);
      });

      // Second request FAILS with Insufficient balance
      await expect(mockDbTransaction(50, 'double-spend-key-2')).rejects.toThrow(
        'Insufficient balance for entry fee',
      );
    });
  });
});
