import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\.ts$': 'ts-jest',
  },
  testEnvironment: 'node',
  testTimeout: 30000,
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config$': '<rootDir>/src/common/config/env.config',
    '^@game/(.*)$': '<rootDir>/src/game/$1',
  },
};

export default config;
