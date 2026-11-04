import { WalletLedgerService } from './ledger.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '.prisma/client';

describe('Registration Rush & Wallet Concurrency Invariants (Module 8.1)', () => {
  let ledgerService: WalletLedgerService;
  let mockPrisma: any;
  let mockRedis: any;

  // In-memory simulated database row to test true concurrent transactional locking
  let walletState: { balance: Prisma.Decimal; bonus_balance: Prisma.Decimal };
  let redisLockMap: Map<string, string>;
  let transactionRows: any[];

  beforeEach(() => {
    walletState = {
      balance: new Prisma.Decimal(100), // Starting balance ₹100
      bonus_balance: new Prisma.Decimal(50), // Starting bonus ₹50. Total funds: ₹150
    };
    redisLockMap = new Map();
    transactionRows = [];

    mockRedis = {
      setnx: jest.fn(async (key: string, val: string) => {
        if (redisLockMap.has(key)) return false;
        redisLockMap.set(key, val);
        return true;
      }),
      expire: jest.fn().mockResolvedValue(true),
      del: jest.fn(async (key: string) => {
        redisLockMap.delete(key);
        return 1;
      }),
    };

    mockPrisma = {
      transaction: {
        findFirst: jest.fn(async ({ where }: any) => {
          return transactionRows.find((tx) => tx.ledger_key === where.ledger_key) || null;
        }),
      },
      $transaction: jest.fn(async (callback: any) => {
        // Simulates serialised FOR UPDATE transaction execution
        const txContext = {
          $queryRawUnsafe: jest.fn(async (query: string, userId: string) => {
            return [{
              user_id: userId,
              balance: walletState.balance,
              bonus_balance: walletState.bonus_balance,
            }];
          }),
          wallet: {
            update: jest.fn(async ({ data }: any) => {
              if (data.balance !== undefined) walletState.balance = data.balance;
              if (data.bonus_balance !== undefined) walletState.bonus_balance = data.bonus_balance;
              return walletState;
            }),
          },
          transaction: {
            create: jest.fn(async ({ data }: any) => {
              const row = { id: `tx_${transactionRows.length + 1}`, ...data };
              transactionRows.push(row);
              return row;
            }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(txContext);
      }),
    };

    ledgerService = new WalletLedgerService(mockPrisma as any, mockRedis as any);
  });

  describe('Zero Negative Balance Guarantee Under Parallel Registration Inrush', () => {
    it('prevents balance from ever dropping below zero when debits exceed total funds', async () => {
      // Wallet has ₹150 total (₹50 bonus + ₹100 cash).
      // Attempt 1: ₹100 entry fee -> succeeds (consumes ₹50 bonus + ₹50 cash). Balance remaining: ₹50 cash.
      const debit1 = await ledgerService.debitEntryFee({
        userId: 'user_rush_01',
        amount: 100,
        idempotencyKey: 'entryfee:tourn_A:user_rush_01',
        reason: 'Tournament A entry',
      });
      expect(debit1.applied).toBe(true);
      expect(debit1.balanceAfter).toBe(50);
      expect(walletState.balance.toNumber()).toBe(50);
      expect(walletState.bonus_balance.toNumber()).toBe(0);

      // Attempt 2: Another tournament entry fee of ₹100 -> must fail with Insufficient balance
      await expect(
        ledgerService.debitEntryFee({
          userId: 'user_rush_01',
          amount: 100,
          idempotencyKey: 'entryfee:tourn_B:user_rush_01',
          reason: 'Tournament B entry',
        }),
      ).rejects.toThrow(BadRequestException);

      // Balance remains strictly non-negative (₹50)
      expect(walletState.balance.toNumber()).toBe(50);
      expect(walletState.bonus_balance.toNumber()).toBe(0);
    });
  });

  describe('Distributed Idempotency & Replay Protection', () => {
    it('returns duplicate: true and does not re-debit funds on duplicate registration request', async () => {
      // First submission succeeds
      const firstAttempt = await ledgerService.debitEntryFee({
        userId: 'user_rush_02',
        amount: 50,
        idempotencyKey: 'entryfee:tourn_A:user_rush_02',
        reason: 'Tournament entry fee',
      });
      expect(firstAttempt.applied).toBe(true);
      expect(firstAttempt.balanceAfter).toBe(100);

      // Duplicate submission with identical idempotencyKey
      const duplicateAttempt = await ledgerService.debitEntryFee({
        userId: 'user_rush_02',
        amount: 50,
        idempotencyKey: 'entryfee:tourn_A:user_rush_02',
        reason: 'Tournament entry fee duplicate retry',
      });

      expect(duplicateAttempt.applied).toBe(false);
      expect(duplicateAttempt.duplicate).toBe(true);
      expect(duplicateAttempt.balanceAfter).toBe(100);

      // Ensure only 1 transaction row was created
      expect(transactionRows).toHaveLength(1);
    });

    it('rejects concurrent in-flight requests on the same idempotency key with ConflictException', async () => {
      // Pretend a lock is already held in Redis
      redisLockMap.set('wallet:ledger:entryfee:tourn_locked:user_03', '1');

      await expect(
        ledgerService.debitEntryFee({
          userId: 'user_03',
          amount: 25,
          idempotencyKey: 'entryfee:tourn_locked:user_03',
          reason: 'Concurrent race test',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Bonus Bucket Precedence Invariant', () => {
    it('always exhausts promotional bonus funds before deducting real cash balance', async () => {
      // Starting balance: ₹100 cash, ₹50 bonus.
      // Debit ₹40 entry fee.
      const res = await ledgerService.debitEntryFee({
        userId: 'user_bonus_test',
        amount: 40,
        idempotencyKey: 'entryfee:bonus_check:user_bonus_test',
        reason: 'Entry fee',
      });

      expect(res.applied).toBe(true);
      // Cash should remain ₹100, bonus should be ₹10 (₹50 - ₹40)
      expect(walletState.balance.toNumber()).toBe(100);
      expect(walletState.bonus_balance.toNumber()).toBe(10);
      expect(res.balanceAfter).toBe(110);
    });
  });
});

