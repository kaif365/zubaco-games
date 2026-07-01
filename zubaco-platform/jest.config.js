/**
 * Jest configuration for the Zubaco platform backend unit-test suite (Phase T1).
 *
 * Unit tests only: pure business-logic services are instantiated directly with
 * lightweight mocks (no database, no Redis, no network). ts-jest compiles the
 * NestJS/TypeScript sources (decorators enabled via tsconfig.spec.json).
 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  rootDir: 'src',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testRegex: '.*\\.spec\\.ts$',
  setupFiles: ['<rootDir>/../jest.setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.spec.json' }],
  },
  clearMocks: true,
};
