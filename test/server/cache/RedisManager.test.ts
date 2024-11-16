import Redis from 'ioredis';
import { jest } from '@jest/globals';

import { RedisManager } from '../../../src/server/cache/RedisManager';
import { config } from '../../../src/server/config';
import { logger } from '../../../src/server/utils/logger';

jest.mock('ioredis');
jest.mock('../../../src/server/utils/logger');

describe('RedisManager', () => {
  let redisManager: RedisManager;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = {
      on: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      quit: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    redisManager = new RedisManager({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connection', () => {
    it('should connect successfully', async () => {
      // Simulate successful connection
      mockRedis.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          callback();
        }
        return mockRedis;
      });

      await redisManager.connect();

      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(logger.info).toHaveBeenCalledWith('Redis connected');
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');

      // Simulate connection error
      mockRedis.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(error);
        }
        return mockRedis;
      });

      await expect(redisManager.connect()).rejects.toThrow('Connection failed');
      expect(logger.error).toHaveBeenCalledWith('Redis connection error:', expect.any(Object));
    });

    it('should handle reconnection', async () => {
      // Simulate reconnection
      mockRedis.on.mockImplementation((event, callback) => {
        if (event === 'reconnecting') {
          callback();
        }
        return mockRedis;
      });

      await redisManager.connect();

      expect(mockRedis.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
      expect(logger.warn).toHaveBeenCalledWith('Redis reconnecting');
    });

    it('should handle disconnection', async () => {
      // Simulate disconnection
      mockRedis.on.mockImplementation((event, callback) => {
        if (event === 'end') {
          callback();
        }
        return mockRedis;
      });

      await redisManager.connect();

      expect(mockRedis.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(logger.warn).toHaveBeenCalledWith('Redis disconnected');
    });
  });

  describe('client management', () => {
    it('should get Redis client', async () => {
      // Simulate successful connection
      mockRedis.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          callback();
        }
        return mockRedis;
      });

      await redisManager.connect();
      const client = await redisManager.getClient();

      expect(client).toBe(mockRedis);
    });

    it('should handle disconnection', async () => {
      await redisManager.disconnect();

      expect(mockRedis.quit).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Redis disconnected');
    });
  });
});
