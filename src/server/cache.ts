import Redis from 'ioredis';

import { CacheCommand } from '../types/cache';
import { Container, Stack } from '../types/models-shared';
import { serverLogger as logger } from '../utils/serverLogger';

let redisClient: Redis | null = null;
let isInitializing = false;
const MAX_RETRY_ATTEMPTS = 5;
const MAX_RETRY_TIME = 30000; // 30 seconds
const BASE_RETRY_DELAY = 1000; // Start with 1 second

// Cache keys and expiration times
export const CACHE_KEYS = {
  SESSION: 'session:',      // User sessions (30 minutes)
  USER: 'user:',           // User data (1 hour)
  COMMAND: 'command:',     // Command history (1 day)
  DOCKER: {
    CONTAINERS: 'docker:containers:',  // Docker containers state (30 seconds)
    STACKS: 'docker:stacks:',         // Docker stacks state (30 seconds)
  },
  HOST: 'host:',          // Host status (1 minute)
  MFA: 'mfa:',            // MFA verification codes (5 minutes)
  PACKAGES: 'packages:',   // Package lists (1 hour)
} as const;

export const CACHE_TTL = {
  SESSION: 1800,    // 30 minutes
  USER: 3600,       // 1 hour
  COMMAND: 86400,   // 1 day
  DOCKER: 30,       // 30 seconds
  HOST: 60,         // 1 minute
  MFA: 300,        // 5 minutes
  PACKAGES: 3600,   // 1 hour
} as const;

// Initialize Redis client with exponential backoff
const initializeRedis = async (): Promise<Redis | null> => {
  if (isInitializing) {
    // Wait for existing initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return redisClient;
  }

  isInitializing = true;
  const startTime = Date.now();

  try {
    logger.info('Initializing Redis client...', {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    });

    const client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times: number): number | null => {
        const elapsedTime = Date.now() - startTime;

        // Stop retrying if we've exceeded our limits
        if (times > MAX_RETRY_ATTEMPTS || elapsedTime > MAX_RETRY_TIME) {
          logger.error('Redis max retry attempts or time exceeded', {
            attempts: times,
            elapsedTime,
            maxAttempts: MAX_RETRY_ATTEMPTS,
            maxTime: MAX_RETRY_TIME,
          });
          return null;
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          BASE_RETRY_DELAY * Math.pow(2, times - 1) + Math.random() * 1000,
          5000,
        );

        logger.info(`Retrying Redis connection in ${delay}ms (attempt ${times}/${MAX_RETRY_ATTEMPTS})...`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      reconnectOnError: (err: Error): boolean => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true; // Only reconnect on specific errors
        }
        return false;
      },
      lazyConnect: true, // Don't connect immediately
    });

    // Set up event handlers
    client.on('connect', () => {
      logger.info('Redis client connected');
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
    });

    client.on('error', (...args: unknown[]) => {
      const err = args[0] instanceof Error ? args[0] : new Error(String(args[0]));
      logger.error('Redis client error', {
        error: err.message,
        stack: err.stack,
      });
    });

    client.on('close', () => {
      logger.warn('Redis connection closed');
    });

    client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    client.on('end', () => {
      logger.info('Redis connection ended');
      redisClient = null;
    });

    // Try to connect
    try {
      await client.connect();
      await client.ping();
      redisClient = client;
      logger.info('Redis initialized successfully');
      return client;
    } catch (err) {
      logger.error('Failed to connect to Redis', {
        error: (err as Error).message,
        stack: (err as Error).stack,
      });
      await client.quit();
      return null;
    }
  } catch (error) {
    logger.error('Failed to initialize Redis', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    return null;
  } finally {
    isInitializing = false;
  }
};

// Get Redis client (initialize if needed)
const getClient = async (): Promise<Redis | null> => {
  if (!redisClient) {
    return initializeRedis();
  }

  // Check if connection is healthy
  try {
    await redisClient.ping();
    return redisClient;
  } catch (err) {
    logger.error('Redis connection check failed', {
      error: (err as Error).message,
    });
    redisClient = null;
    return initializeRedis();
  }
};

// Check if Redis is connected
export const isConnected = (): boolean =>
  redisClient?.status === 'ready' ?? false;

// Wrapper for Redis operations with fallback
const withRedis = async <T>(
  operation: (client: Redis) => Promise<T>,
  fallback: T,
): Promise<T> => {
  const client = await getClient();
  if (!client) {
    return fallback;
  }

  try {
    return await operation(client);
  } catch (err) {
    logger.error('Redis operation failed', {
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    return fallback;
  }
};

// Session caching
export const cacheSession = async (token: string, sessionData: string): Promise<void> => {
  await withRedis(
    async (client) => {
      await client.setex(`${CACHE_KEYS.SESSION}${token}`, CACHE_TTL.SESSION, sessionData);
      logger.debug('Session cached', { token });
    },
    undefined,
  );
};

export const getSession = async (token: string): Promise<string | null> => {
  return withRedis(
    async (client) => {
      const data = await client.get(`${CACHE_KEYS.SESSION}${token}`);
      logger.debug('Session retrieved', { token, found: !!data });
      return data;
    },
    null,
  );
};

// Command history caching
export const cacheCommand = async (
  userId: string,
  hostId: string,
  command: CacheCommand | CacheCommand[],
): Promise<void> => {
  await withRedis(
    async (client) => {
      const key = `${CACHE_KEYS.COMMAND}${userId}:${hostId}`;
      const commands = Array.isArray(command) ? command : [command];

      // Get existing commands
      const existingData = await client.get(key);
      const existingCommands = existingData ? JSON.parse(existingData) : [];

      // Combine and limit to last 100 commands
      const updatedCommands = [...commands, ...existingCommands].slice(0, 100);

      await client.setex(key, CACHE_TTL.COMMAND, JSON.stringify(updatedCommands));
    },
    undefined,
  );
};

export const getCommands = async (
  userId: string,
  hostId: string,
): Promise<CacheCommand[] | null> => {
  return withRedis(
    async (client) => {
      const data = await client.get(`${CACHE_KEYS.COMMAND}${userId}:${hostId}`);
      return data ? JSON.parse(data) : null;
    },
    null,
  );
};

// Docker state caching
export const getDockerContainers = async (hostId: string): Promise<Container[] | null> => {
  return withRedis(
    async (client) => {
      const data = await client.get(`${CACHE_KEYS.DOCKER.CONTAINERS}${hostId}`);
      return data ? JSON.parse(data) : null;
    },
    null,
  );
};

export const cacheDockerContainers = async (hostId: string, data: Container[]): Promise<void> => {
  await withRedis(
    async (client) => {
      await client.setex(
        `${CACHE_KEYS.DOCKER.CONTAINERS}${hostId}`,
        CACHE_TTL.DOCKER,
        JSON.stringify(data),
      );
    },
    undefined,
  );
};

export const getDockerStacks = async (hostId: string): Promise<Stack[] | null> => {
  return withRedis(
    async (client) => {
      const data = await client.get(`${CACHE_KEYS.DOCKER.STACKS}${hostId}`);
      return data ? JSON.parse(data) : null;
    },
    null,
  );
};

export const cacheDockerStacks = async (hostId: string, data: Stack[]): Promise<void> => {
  await withRedis(
    async (client) => {
      await client.setex(
        `${CACHE_KEYS.DOCKER.STACKS}${hostId}`,
        CACHE_TTL.DOCKER,
        JSON.stringify(data),
      );
    },
    undefined,
  );
};

// Host caching
export const getHostStatus = async (id: string): Promise<unknown> => {
  return withRedis(
    async (client) => {
      const data = await client.get(`${CACHE_KEYS.HOST}${id}`);
      return data ? JSON.parse(data) : null;
    },
    null,
  );
};

export const cacheHostStatus = async (id: string, data: unknown): Promise<void> => {
  await withRedis(
    async (client) => {
      await client.setex(
        `${CACHE_KEYS.HOST}${id}`,
        CACHE_TTL.HOST,
        JSON.stringify(data),
      );
    },
    undefined,
  );
};

export const invalidateHostCache = async (id: string): Promise<void> => {
  await withRedis(
    async (client) => {
      await client.del(`${CACHE_KEYS.HOST}${id}`);
    },
    undefined,
  );
};

// Health check
export const healthCheck = async (): Promise<{ status: string; connected: boolean; error?: string }> => {
  const client = await getClient();
  if (!client) {
    return {
      status: 'unhealthy',
      connected: false,
      error: 'Redis client not available',
    };
  }

  try {
    await client.ping();
    return {
      status: 'healthy',
      connected: true,
    };
  } catch (error) {
    logger.error('Redis health check failed', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    return {
      status: 'unhealthy',
      connected: false,
      error: (error as Error).message,
    };
  }
};

// Initialize Redis on module load
void initializeRedis();

// Export an async function to get the Redis client
export const redis = {
  getClient,
};

export default {
  redis,
  cacheSession,
  getSession,
  healthCheck,
  isConnected,
  CACHE_KEYS,
  CACHE_TTL,
  getHostStatus,
  cacheHostStatus,
  invalidateHostCache,
  getDockerContainers,
  cacheDockerContainers,
  getDockerStacks,
  cacheDockerStacks,
  cacheCommand,
  getCommands,
};
