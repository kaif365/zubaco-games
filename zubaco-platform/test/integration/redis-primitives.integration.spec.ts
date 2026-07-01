import Redis from 'ioredis';
import { RedisService } from '../../src/common/redis/redis.service';
import { adminClient, assertRedisReachable } from './redis-test-util';

/**
 * INTEGRATION — Redis primitives against a REAL Redis server.
 *
 * These are the exact operations the platform relies on for distributed locks
 * (enforcement / withdrawal disbursement), idempotency + replay protection, and
 * leaderboard caching/ranking. We drive them through the real RedisService
 * (real ioredis client) so the semantics are verified end-to-end, not mocked.
 */
describe('INTEGRATION Redis primitives (real Redis)', () => {
  let redis: RedisService;
  let admin: Redis;

  beforeAll(async () => {
    admin = adminClient();
    await assertRedisReachable(admin);
    redis = new RedisService();
  });

  afterAll(async () => {
    await redis.onModuleDestroy();
    await admin.quit();
  });

  beforeEach(async () => {
    await admin.flushdb();
  });

  describe('distributed lock (SETNX)', () => {
    it('grants the lock to exactly one acquirer and blocks the rest', async () => {
      const key = 'withdrawal:disburse:lock:user-1';
      expect(await redis.setnx(key, '1')).toBe(true); // first wins
      expect(await redis.setnx(key, '1')).toBe(false); // contender blocked
      expect(await redis.setnx(key, '1')).toBe(false);
    });

    it('allows re-acquisition after the lock is released', async () => {
      const key = 'enforce:lock:user-2';
      expect(await redis.setnx(key, '1')).toBe(true);
      await redis.del(key);
      expect(await redis.setnx(key, '1')).toBe(true); // freed and re-taken
    });
  });

  describe('idempotency / replay window', () => {
    it('treats the first key write as new and subsequent writes as duplicates', async () => {
      const key = 'idem:deposit:order:abc123';
      expect(await redis.setnx(key, 'processed')).toBe(true); // first request
      expect(await redis.setnx(key, 'processed')).toBe(false); // replay suppressed
      await redis.expire(key, 3600); // window applied
    });

    it('increments a monotonic counter for rate limiting', async () => {
      const key = 'rl:otp:+911234567890';
      expect(await redis.incr(key)).toBe(1);
      expect(await redis.incr(key)).toBe(2);
      expect(await redis.incr(key)).toBe(3);
    });
  });

  describe('key/value caching with TTL', () => {
    it('stores and retrieves a value, and honours a TTL write', async () => {
      await redis.set('cache:profile:u1', '{"name":"a"}');
      expect(await redis.get('cache:profile:u1')).toBe('{"name":"a"}');

      await redis.set('cache:short', 'v', 60);
      expect(await redis.get('cache:short')).toBe('v');
      expect(await admin.ttl('cache:short')).toBeGreaterThan(0);

      await redis.del('cache:profile:u1');
      expect(await redis.get('cache:profile:u1')).toBeNull();
    });
  });

  describe('leaderboard sorted-set ranking (cache)', () => {
    const KEY = 'leaderboard:season:s1';

    beforeEach(async () => {
      await redis.zadd(KEY, 1500, 'userA');
      await redis.zadd(KEY, 2500, 'userB');
      await redis.zadd(KEY, 500, 'userC');
    });

    it('ranks members highest-score-first (0-based)', async () => {
      expect(await redis.zrevrank(KEY, 'userB')).toBe(0); // top
      expect(await redis.zrevrank(KEY, 'userA')).toBe(1);
      expect(await redis.zrevrank(KEY, 'userC')).toBe(2); // bottom
    });

    it('returns the ordered top-N with scores', async () => {
      const top = await redis.zrevrange(KEY, 0, 1, true);
      expect(top).toEqual(['userB', '2500', 'userA', '1500']);
    });

    it('reads a single member score and updates it on re-add', async () => {
      expect(await redis.zscore(KEY, 'userA')).toBe('1500');
      await redis.zadd(KEY, 3000, 'userA'); // score update
      expect(await redis.zscore(KEY, 'userA')).toBe('3000');
      expect(await redis.zrevrank(KEY, 'userA')).toBe(0); // now top
    });

    it('filters members by score range and removes a member', async () => {
      const midHigh = await redis.zrangebyscore(KEY, 1000, 3000);
      expect(midHigh).toEqual(['userA', 'userB']); // ascending within range

      expect(await redis.zrem(KEY, 'userC')).toBe(1);
      expect(await redis.zscore(KEY, 'userC')).toBeNull();
    });
  });
});
