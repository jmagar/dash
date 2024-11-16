import { jest } from '@jest/globals';
import RedisMock from 'ioredis-mock';

// Mock environment variables
process.env.NODE_ENV = 'test';

// Mock Redis
jest.mock('ioredis', () => {
  const mock = jest.requireActual('ioredis-mock');
  return mock;
});

// Mock logger
jest.mock('../src/server/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock config
jest.mock('../src/server/config', () => ({
  config: {
    redis: {
      host: 'localhost',
      port: 6379,
    },
    jwt: {
      secret: 'test-secret',
      expiresIn: '1h',
    },
    logging: {
      level: 'debug',
    },
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
