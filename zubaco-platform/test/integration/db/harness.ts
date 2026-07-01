/**
 * Per-spec harness for the DATABASE-BACKED integration suite. Wires the shared
 * real Prisma + a real Redis client into the full production service graph, and
 * exposes a `reset()` that returns the world to a pristine state (empty DB +
 * flushed Redis) so every test is fully isolated — real transaction rollback and
 * idempotency behaviour is observed, never simulated.
 */
import Redis from 'ioredis';
import { getPrisma, disconnectPrisma, resetDb } from './prisma-test-util';
import { buildServiceGraph, ServiceGraph } from './service-graph';
import { RedisService } from '../../../src/common/redis/redis.service';
import { redisConnectOptions } from '../redis-test-util';

export interface Harness {
  graph: ServiceGraph;
  /** Direct Redis connection for asserting/inspecting keys the services write. */
  redisAdmin: Redis;
  /** Empty the database and flush Redis for a clean per-test slate. */
  reset: () => Promise<void>;
  /** Release all connections (call from afterAll). */
  stop: () => Promise<void>;
}

export async function startHarness(): Promise<Harness> {
  const prisma = await getPrisma();
  const redisService = new RedisService();
  const graph = buildServiceGraph(prisma, redisService);
  const redisAdmin = new Redis({ ...redisConnectOptions, maxRetriesPerRequest: 3 });

  // Fail fast with a clear message if the backing services aren't up.
  const pong = await redisAdmin.ping();
  if (pong !== 'PONG') {
    throw new Error(`Redis not reachable at ${redisConnectOptions.host}:${redisConnectOptions.port}`);
  }
  await prisma.$queryRawUnsafe('SELECT 1');

  return {
    graph,
    redisAdmin,
    reset: async () => {
      await resetDb(prisma);
      await redisAdmin.flushdb();
    },
    stop: async () => {
      await disconnectPrisma();
      redisService.onModuleDestroy();
      redisAdmin.disconnect();
    },
  };
}
