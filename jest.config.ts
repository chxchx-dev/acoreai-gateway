import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/smoke/**/*.spec.ts'],
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^jsdom$': '<rootDir>/test/__mocks__/jsdom.ts',
  },
  testTimeout: 30000,
  maxWorkers: 1,
};

export default config;
