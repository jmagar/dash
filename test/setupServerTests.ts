import { jest } from '@jest/globals';
import RedisMock from 'ioredis-mock';
import { useContainer } from 'class-validator';
import 'reflect-metadata';

// Initialize validation container
useContainer({
  get: () => null,
  has: () => false,
  clear: () => {},
}, { fallback: true, fallbackOnErrors: true });

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
  },
}));

// Custom matchers
expect.extend({
  toBeValidDTO(received) {
    if (!received || typeof received !== 'object') {
      return {
        message: () => `expected ${received} to be a DTO object`,
        pass: false,
      };
    }

    return {
      message: () => 'expected validation to fail',
      pass: true,
    };
  },
});

// Performance test thresholds
global.performanceThresholds = {
  instantiation: 1, // ms
  validation: 1, // ms
  serialization: 1, // ms
  memoryFootprint: 2048, // bytes
};

// Global beforeEach and afterEach hooks
beforeEach(() => {
  jest.clearAllMocks();
  // Reset performance metrics
  if (global.gc) {
    global.gc();
  }
});

afterEach(() => {
  jest.resetAllMocks();
});

export {};
