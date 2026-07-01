/**
 * Jest configuration for the Zubaco platform INTEGRATION test suite (Phase T2).
 *
 * These tests exercise REAL component interaction against a REAL Redis server
 * (the EventBus, the durable Webhook outbox, and the Redis primitives that back
 * locks / idempotency / leaderboard caching). They are kept separate from the
 * unit suite (jest.config.js) and are run explicitly via `npm run test:integration`.
 *
 * Prerequisite: a Redis server reachable at REDIS_HOST:REDIS_PORT (default
 * 127.0.0.1:6379). Postgres-backed flows are intentionally NOT covered here —
 * see IMPLEMENTATION_SUMMARY_TESTING_T2_INTEGRATION.txt (section 18).
 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/integration/**/*.integration.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/test/integration/setup.env.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  testTimeout: 30000,
  maxWorkers: 1, // serialised — the specs share one Redis instance
  clearMocks: true,
};
