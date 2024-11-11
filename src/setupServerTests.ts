import { jest } from '@jest/globals';
import type RedisMock from 'ioredis-mock';

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRATION = '30m';
process.env.NODE_ENV = 'test';

// Mock Redis
jest.mock('ioredis', () => {
  const mock = jest.requireActual<typeof RedisMock>('ioredis-mock');
  return mock;
});

// Mock Winston logger
jest.mock('./utils/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Global beforeEach and afterEach hooks
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.resetAllMocks();
});

export {};
