import type { Redis } from 'ioredis';
import { jest } from '@jest/globals';

import { CacheService } from '../../../src/server/cache/CacheService';
import { RedisManager } from '../../../src/server/cache/RedisManager';

// Mock Redis client
interface MockRedis {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  lpush: jest.Mock;
  lrange: jest.Mock;
  expire: jest.Mock;
  quit: jest.Mock;
  on: jest.Mock;
}

// Mock RedisManager
interface MockRedisManager {
  getClient: jest.Mock;
}

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedis: MockRedis;
  let mockRedisManager: MockRedisManager;

  beforeEach(() => {
    // Create mock Redis client
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      lpush: jest.fn(),
      lrange: jest.fn(),
      expire: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
    };

    // Create mock RedisManager
    mockRedisManager = {
      getClient: jest.fn().mockResolvedValue(mockRedis),
    };

    // Create CacheService instance with mocked dependencies
    cacheService = new CacheService(mockRedisManager as unknown as RedisManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setSession', () => {
    it('should cache session data', async () => {
      const token = 'test-token';
      const sessionData = { id: '1', username: 'test' };

      await cacheService.setSession(token, sessionData);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `session:${token}`,
        JSON.stringify(sessionData),
        'EX',
        3600
      );
    });
  });

  describe('getSession', () => {
    it('should retrieve cached session data', async () => {
      const token = 'test-token';
      const sessionData = { id: '1', username: 'test' };

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));

      const result = await cacheService.getSession(token);

      expect(mockRedis.get).toHaveBeenCalledWith(`session:${token}`);
      expect(result).toEqual(sessionData);
    });
  });

  describe('setHostStatus', () => {
    it('should cache host status data', async () => {
      const hostId = '1';
      const hostData = { status: 'online' };

      await cacheService.setHostStatus(hostId, hostData);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `host:${hostId}:status`,
        JSON.stringify(hostData),
        'EX',
        300
      );
    });
  });

  describe('getHostStatus', () => {
    it('should retrieve cached host status data', async () => {
      const hostId = '1';
      const hostData = { status: 'online' };

      mockRedis.get.mockResolvedValue(JSON.stringify(hostData));

      const result = await cacheService.getHostStatus(hostId);

      expect(mockRedis.get).toHaveBeenCalledWith(`host:${hostId}:status`);
      expect(result).toEqual(hostData);
    });
  });

  describe('invalidateHostCache', () => {
    it('should delete host cache entries', async () => {
      const hostId = '1';

      await cacheService.invalidateHostCache(hostId);

      expect(mockRedis.del).toHaveBeenCalledWith(`host:${hostId}:status`);
    });
  });

  describe('error handling', () => {
    it('should handle Redis client errors', async () => {
      const error = new Error('Redis error');
      jest.spyOn(mockRedisManager, 'getClient').mockRejectedValueOnce(error);

      const result = await cacheService.getSession('test-token');

      expect(result).toBeNull();
    });

    it('should handle null Redis client', async () => {
      jest.spyOn(mockRedisManager, 'getClient').mockResolvedValueOnce(null);

      const result = await cacheService.getHostStatus('1');

      expect(result).toBeNull();
    });
  });
});
