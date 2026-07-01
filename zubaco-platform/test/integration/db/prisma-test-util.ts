/**
 * Shared PostgreSQL helpers for the Phase T4-A DATABASE-BACKED integration
 * suite. Provides a single real {@link PrismaService} bound to the isolated
 * `zubaco_test` database (provisioned by docker-compose.test.yml), a fast
 * TRUNCATE-based reset for per-test isolation, and small factories for the
 * fixtures every business flow needs (users, wallets, seasons).
 *
 * There is NO mocking here — every write lands in the real test database and is
 * read back through the real Prisma client, exactly as production would.
 */
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../src/common/prisma/prisma.service';
import { GameType } from '.prisma/client';

let prismaSingleton: PrismaService | null = null;

/** Lazily create and connect ONE PrismaService for the whole spec file. */
export async function getPrisma(): Promise<PrismaService> {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaService();
    await prismaSingleton.$connect();
  }
  return prismaSingleton;
}

/** Disconnect the shared PrismaService (call from afterAll to free handles). */
export async function disconnectPrisma(): Promise<void> {
  if (prismaSingleton) {
    await prismaSingleton.$disconnect();
    prismaSingleton = null;
  }
}

/**
 * Every table in the schema, ordered so a single `TRUNCATE ... CASCADE`
 * empties the whole database. Truncating is faster than per-row deletes and
 * resets identity, giving each test a pristine, deterministic starting state.
 */
const ALL_TABLES = [
  'auth_providers',
  'refresh_tokens',
  'otp_verifications',
  'user_devices',
  'level_results',
  'game_progress',
  'level_configs',
  'game_sessions',
  'stage_games',
  'stage_entries',
  'season_entries',
  'cohorts',
  'season_stages',
  'seasons',
  'leaderboard_entries',
  'leaderboards',
  'transactions',
  'wallets',
  'friendships',
  'referrals',
  'notifications',
  'user_achievements',
  'achievements',
  'user_energy',
  'cheat_flags',
  'challenges',
  'kyc_documents',
  'bank_details',
  'tds_records',
  'users',
];

/** Empty every table (FK-safe via CASCADE) for a clean per-test slate. */
export async function resetDb(prisma: PrismaService): Promise<void> {
  const list = ALL_TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}

/** Create a real User row; unique phone/email so parallel-safe and collision-free. */
export async function createUser(
  prisma: PrismaService,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; phone: string }> {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      username: `u_${suffix}`,
      display_name: `User ${suffix}`,
      email: `u_${suffix}@test.local`,
      phone: `+9199${suffix.replace(/\D/g, '0').padEnd(8, '0').slice(0, 8)}`,
      ...overrides,
    },
  });
  return { id: user.id, phone: user.phone! };
}

/** Create a User plus a Wallet with the given opening balances. */
export async function createUserWithWallet(
  prisma: PrismaService,
  opts: { balance?: number; bonus?: number; ageVerified?: boolean } = {},
): Promise<{ userId: string; id: string; phone: string }> {
  const { id, phone } = await createUser(prisma, { age_verified: opts.ageVerified ?? false });
  await prisma.wallet.create({
    data: {
      user_id: id,
      balance: opts.balance ?? 0,
      bonus_balance: opts.bonus ?? 0,
    },
  });
  return { userId: id, id, phone };
}

/** Read the current cash + bonus balance for assertions. */
export async function getBalances(
  prisma: PrismaService,
  userId: string,
): Promise<{ balance: number; bonus: number }> {
  const w = await prisma.wallet.findUnique({ where: { user_id: userId } });
  return { balance: Number(w?.balance ?? 0), bonus: Number(w?.bonus_balance ?? 0) };
}

/** A concrete GameType handy for tests that just need a valid enum value. */
export const SAMPLE_GAME: GameType = 'SLIDING_PUZZLE';
