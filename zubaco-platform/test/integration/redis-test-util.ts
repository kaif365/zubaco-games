import Redis from 'ioredis';

/**
 * Shared helpers for the integration suite. Provides a direct ("admin") Redis
 * connection used to flush state between tests and to inspect the sorted-set
 * outboxes/dead-letter queues that the services under test write to.
 */
export const redisConnectOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || '6379'),
};

export function adminClient(): Redis {
  return new Redis({ ...redisConnectOptions, maxRetriesPerRequest: 3 });
}

/** Verify a live Redis is reachable; fail fast with a clear message otherwise. */
export async function assertRedisReachable(client: Redis): Promise<void> {
  const pong = await client.ping();
  if (pong !== 'PONG') throw new Error(`Redis not reachable at ${redisConnectOptions.host}:${redisConnectOptions.port}`);
}
