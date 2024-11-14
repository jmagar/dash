import { jest } from '@jest/globals';
import { CacheService } from '../../../src/server/cache/CacheService';
import { RedisManager } from '../../../src/server/cache/RedisManager';
import { logger } from '../../../src/server/utils/logger';
import type { CacheCommand } from '../../../src/types/cache';
import { EventEmitter } from 'events';
import Redis from 'ioredis';

// Mock dependencies
jest.mock('../../../src/server/cache/RedisManager');
jest.mock('../../../src/server/utils/logger');

// Helper type for mock Redis client
type MockRedis = {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  lpush: jest.Mock;
  lrange: jest.Mock;
  expire: jest.Mock;
  quit: jest.Mock;
  on: jest.Mock;
};

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedisManager: RedisManager;
  let mockRedis: MockRedis;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock redis client
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

    // Setup default mock implementations
    mockRedis.get.mockImplementation(() => Promise.resolve(null));
    mockRedis.set.mockImplementation(() => Promise.resolve('OK'));
    mockRedis.del.mockImplementation(() => Promise.resolve(1));
    mockRedis.lpush.mockImplementation(() => Promise.resolve(1));
    mockRedis.lrange.mockImplementation(() => Promise.resolve([]));
    mockRedis.expire.mockImplementation(() => Promise.resolve(1));

    // Setup mock Redis manager
    mockRedisManager = new EventEmitter() as RedisManager;
    Object.assign(mockRedisManager, {
      getClient: jest.fn().mockResolvedValue(mockRedis as unknown as Redis),
      isConnected: jest.fn().mockReturnValue(true),
      shutdown: jest.fn(),
      getMetrics: jest.fn(),
      getState: jest.fn(),
    });

    // Cast the mock to the correct type
    (RedisManager.getInstance as jest.Mock).mockReturnValue(mockRedisManager);

    cacheService = new CacheService();
  });

  describe('session management', () => {
    it('should cache session data', async () => {
      const token = 'test-token';
      const sessionData = 'test-session-data';

      await cacheService.cacheSession(token, sessionData);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `${cacheService.CACHE_KEYS.SESSION}:${token}`,
        sessionData,
        'EX',
        cacheService.CACHE_TTL.SESSION
      );
    });

    it('should retrieve session data', async () => {
      const token = 'test-token';
      const sessionData = 'test-session-data';

      mockRedis.get.mockImplementationOnce(() => Promise.resolve(sessionData));

      const result = await cacheService.getSession(token);

      expect(result).toBe(sessionData);
      expect(mockRedis.get).toHaveBeenCalledWith(
        `${cacheService.CACHE_KEYS.SESSION}:${token}`
      );
    });
  });

  describe('host management', () => {
    it('should cache host status', async () => {
      const hostId = 'test-host';
      const hostData = { status: 'active' };

      await cacheService.cacheHostStatus(hostId, hostData);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `${cacheService.CACHE_KEYS.HOST}:${hostId}:status`,
        JSON.stringify(hostData),
        'EX',
        cacheService.CACHE_TTL.HOST
      );
    });

    it('should retrieve host status', async () => {
      const hostId = 'test-host';
      const hostData = { status: 'active' };

      mockRedis.get.mockImplementationOnce(() => Promise.resolve(JSON.stringify(hostData)));

      const result = await cacheService.getHostStatus(hostId);

      expect(result).toEqual(hostData);
      expect(mockRedis.get).toHaveBeenCalledWith(
        `${cacheService.CACHE_KEYS.HOST}:${hostId}:status`
      );
    });

    it('should invalidate host cache', async () => {
      const hostId = 'test-host';

      await cacheService.invalidateHostCache(hostId);

      expect(mockRedis.del).toHaveBeenCalledWith(
        `${cacheService.CACHE_KEYS.HOST}:${hostId}:status`
      );
    });
  });

  describe('docker management', () => {
    it('should cache docker containers', async () => {
      const hostId = 'test-host';
      const containers = [{ id: 'container1' }];

      await cacheService.cacheDockerContainers(hostId, containers);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `${cacheService.CACHE_KEYS.DOCKER.CONTAINERS}:${hostId}`,
        JSON.stringify(containers),
        'EX',
        cacheService.CACHE_TTL.DOCKER
      );
    });

    it('should retrieve docker containers', async () => {
      const hostId = 'test-host';
      const containers = [{ id: 'container1' }];

      mockRedis.get.mockImplementationOnce(() => Promise.resolve(JSON.stringify(containers)));

      const result = await cacheService.getDockerContainers(hostId);

      expect(result).toEqual(containers);
      expect(mockRedis.get).toHaveBeenCalledWith(
        `${cacheService.CACHE_KEYS.DOCKER.CONTAINERS}:${hostId}`
      );
    });
  });

  describe('command history', () => {
    it('should cache commands', async () => {
      const userId = 'test-user';
      const hostId = 'test-host';
      const command: CacheCommand = {
        command: 'test-command',
        timestamp: new Date(),
      };

      await cacheService.cacheCommand(userId, hostId, command);

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        `${cacheService.CACHE_KEYS.COMMAND}:${userId}:${hostId}`,
        JSON.stringify(command)
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        `${cacheService.CACHE_KEYS.COMMAND}:${userId}:${hostId}`,
        cacheService.CACHE_TTL.COMMAND
      );
    });

    it('should retrieve commands', async () => {
      const userId = 'test-user';
      const hostId = 'test-host';
      const commands: CacheCommand[] = [
        {
          command: 'test-command',
          timestamp: new Date(),
        },
      ];

      mockRedis.lrange.mockImplementationOnce(() =>
        Promise.resolve(commands.map(cmd => JSON.stringify(cmd)))
      );

      const result = await cacheService.getCommands(userId, hostId);

      expect(result).toEqual(commands);
      expect(mockRedis.lrange).toHaveBeenCalledWith(
        `${cacheService.CACHE_KEYS.COMMAND}:${userId}:${hostId}`,
        0,
        -1
      );
    });
  });

  describe('error handling', () => {
    it('should handle Redis client errors', async () => {
      const error = new Error('Redis error');
      jest.mocked(mockRedisManager.getClient).mockRejectedValueOnce(error);

      await cacheService.getSession('test-token');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get session:',
        expect.objectContaining({
          error: error.message,
        })
      );
    });

    it('should handle JSON parsing errors', async () => {
      const hostId = 'test-host';
      mockRedis.get.mockImplementationOnce(() => Promise.resolve('invalid-json'));

      const result = await cacheService.getHostStatus(hostId);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle missing Redis client', async () => {
      jest.mocked(mockRedisManager.getClient).mockResolvedValueOnce(null);

      const result = await cacheService.getSession('test-token');

      expect(result).toBeNull();
    });
  });
});
