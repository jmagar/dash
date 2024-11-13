import { jest } from '@jest/globals';
import Redis from 'ioredis';
import { RedisManager } from '../../../src/server/cache/RedisManager';
import { ConnectionState } from '../../../src/server/cache/types';
import { logger } from '../../../src/server/utils/logger';

// Mock Redis and logger
jest.mock('ioredis');
jest.mock('../../../src/server/utils/logger');

describe('RedisManager', () => {
  let redisManager: RedisManager;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create a new instance for each test
    redisManager = RedisManager.getInstance();
    mockRedis = new Redis() as jest.Mocked<Redis>;
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = RedisManager.getInstance();
      const instance2 = RedisManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('connection management', () => {
    it('should connect successfully', async () => {
      const client = await redisManager.getClient();
      expect(client).toBeTruthy();
      expect(redisManager.getState()).toBe(ConnectionState.CONNECTED);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockRedis.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(error);
        }
        return mockRedis;
      });

      await redisManager.getClient();
      expect(logger.error).toHaveBeenCalledWith(
        'Redis connection error:',
        expect.objectContaining({
          error: error.message,
        })
      );
      expect(redisManager.getState()).toBe(ConnectionState.ERROR);
    });

    it('should handle reconnection', async () => {
      mockRedis.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          callback();
        }
        return mockRedis;
      });

      const client = await redisManager.getClient();
      expect(client).toBeTruthy();
      expect(redisManager.isConnected()).toBe(true);
    });
  });

  describe('metrics collection', () => {
    it('should collect metrics', async () => {
      const mockInfo = `
        used_memory:1024
        keys:100
        uptime_in_seconds:3600
      `;

      mockRedis.info.mockResolvedValue(mockInfo);
      mockRedis.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          callback();
        }
        return mockRedis;
      });

      await redisManager.getClient();
      const metrics = redisManager.getMetrics();

      expect(metrics).toEqual(
        expect.objectContaining({
          memoryUsage: 1024,
          keyCount: 100,
          uptime: 3600,
        })
      );
    });

    it('should handle metrics collection errors', async () => {
      const error = new Error('Metrics collection failed');
      mockRedis.info.mockRejectedValue(error);

      mockRedis.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          callback();
        }
        return mockRedis;
      });

      await redisManager.getClient();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update Redis metrics:',
        expect.objectContaining({
          error: error.message,
        })
      );
    });
  });

  describe('shutdown', () => {
    it('should gracefully shutdown', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await redisManager.shutdown();
      expect(mockRedis.quit).toHaveBeenCalled();
      expect(redisManager.getState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should handle shutdown errors', async () => {
      const error = new Error('Shutdown failed');
      mockRedis.quit.mockRejectedValue(error);

      await redisManager.shutdown();
      expect(logger.error).toHaveBeenCalledWith(
        'Redis connection error:',
        expect.objectContaining({
          error: error.message,
        })
      );
    });
  });
});
