/**
 * Jest configuration for the Zubaco platform HTTP / API / END-TO-END suite
 * (Phase T4-B).
 *
 * Unlike the unit suite (jest.config.js) and the DB-integration suite
 * (jest.integration.config.js), these specs boot the ENTIRE real NestJS
 * application via `@nestjs/testing` and drive it through REAL HTTP requests
 * (supertest) against the REAL `zubaco_test` PostgreSQL + Redis provisioned by
 * docker-compose.test.yml. No business services are mocked; only external
 * providers (SMS) are stubbed at the DI boundary.
 *
 * Run explicitly via `npm run test:e2e` (infra must be up: `npm run
 * test:infra:up` + `npm run test:db:push`).
 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/e2e/**/*.e2e.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/test/e2e/setup.env.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  // ESM-interop: the ESM-only `uuid` v14 cannot be required by Jest's module
  // runtime. Reuse the CommonJS shim (real crypto UUIDs) from the integration
  // suite so the booted AppModule loads cleanly under ts-jest.
  moduleNameMapper: {
    '^uuid$': '<rootDir>/test/integration/uuid-cjs-shim.js',
    // ESM-only OAuth deps (Apple/Google) — not exercised by HTTP E2E. Stub so
    // the booted AppModule loads under Jest's CommonJS runtime.
    '^jose$': '<rootDir>/test/e2e/esm-noop-stub.js',
    '^jwks-rsa$': '<rootDir>/test/e2e/esm-noop-stub.js',
  },
  testTimeout: 60000,
  maxWorkers: 1, // serialised — one shared app + Postgres + Redis instance
  clearMocks: true,
};
