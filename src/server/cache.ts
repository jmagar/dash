import Redis from 'ioredis';

import { Container, Stack } from '../types/models-shared';
import { serverLogger as logger } from '../utils/serverLogger';

let redisClient: Redis | null = null;

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
} as const;

export const CACHE_TTL = {
  SESSION: 1800,    // 30 minutes
  USER: 3600,       // 1 hour
  COMMAND: 86400,   // 1 day
  DOCKER: 30,       // 30 seconds
  HOST: 60,         // 1 minute
  MFA: 300,         // 5 minutes
} as const;

// Initialize Redis client
const initializeRedis = (): Redis => {
  try {
    logger.info('Initializing Redis client...', {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    });

    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times: number): number => {
        const delay = Math.min(times * 50, 2000);
        logger.info(`Retrying Redis connection (attempt ${times})...`);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (...args: unknown[]) => {
      const err = args[0] instanceof Error ? args[0] : new Error(String(args[0]));
      logger.error('Redis client error', {
        error: err.message,
        stack: err.stack,
      });
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    redisClient.on('end', () => {
      logger.info('Redis connection ended');
    });

    logger.info('Redis initialized successfully');
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
};

// Get Redis client (initialize if needed)
const getClient = (): Redis => {
  if (!redisClient) {
    redisClient = initializeRedis();
  }
  return redisClient;
};

// Check if Redis is connected
export const isConnected = (): boolean =>
  redisClient?.status === 'ready' ?? false;

// Session caching
export const cacheSession = async (token: string, sessionData: string): Promise<void> => {
  try {
    const client = getClient();
    await client.setex(`${CACHE_KEYS.SESSION}${token}`, CACHE_TTL.SESSION, sessionData);
    logger.debug('Session cached', { token });
  } catch (error) {
    logger.error('Failed to cache session', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      token,
    });
    throw error;
  }
};

export const getSession = async (token: string): Promise<string | null> => {
  try {
    const client = getClient();
    const data = await client.get(`${CACHE_KEYS.SESSION}${token}`);
    logger.debug('Session retrieved', { token, found: !!data });
    return data;
  } catch (error) {
    logger.error('Failed to get session', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      token,
    });
    throw error;
  }
};

// Docker state caching
export const getDockerContainers = async (hostId: string): Promise<Container[] | null> => {
  try {
    const client = getClient();
    const data = await client.get(`${CACHE_KEYS.DOCKER.CONTAINERS}${hostId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Failed to get Docker containers', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      hostId,
    });
    throw error;
  }
};

export const cacheDockerContainers = async (hostId: string, data: Container[]): Promise<void> => {
  try {
    const client = getClient();
    await client.setex(
      `${CACHE_KEYS.DOCKER.CONTAINERS}${hostId}`,
      CACHE_TTL.DOCKER,
      JSON.stringify(data),
    );
  } catch (error) {
    logger.error('Failed to cache Docker containers', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      hostId,
    });
    throw error;
  }
};

export const getDockerStacks = async (hostId: string): Promise<Stack[] | null> => {
  try {
    const client = getClient();
    const data = await client.get(`${CACHE_KEYS.DOCKER.STACKS}${hostId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Failed to get Docker stacks', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      hostId,
    });
    throw error;
  }
};

export const cacheDockerStacks = async (hostId: string, data: Stack[]): Promise<void> => {
  try {
    const client = getClient();
    await client.setex(
      `${CACHE_KEYS.DOCKER.STACKS}${hostId}`,
      CACHE_TTL.DOCKER,
      JSON.stringify(data),
    );
  } catch (error) {
    logger.error('Failed to cache Docker stacks', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      hostId,
    });
    throw error;
  }
};

// Host caching
export const getHostStatus = async (id: string): Promise<unknown> => {
  try {
    const client = getClient();
    const data = await client.get(`${CACHE_KEYS.HOST}${id}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Failed to get host status', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      id,
    });
    throw error;
  }
};

export const cacheHostStatus = async (id: string, data: unknown): Promise<void> => {
  try {
    const client = getClient();
    await client.setex(
      `${CACHE_KEYS.HOST}${id}`,
      CACHE_TTL.HOST,
      JSON.stringify(data),
    );
  } catch (error) {
    logger.error('Failed to cache host status', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      id,
    });
    throw error;
  }
};

export const invalidateHostCache = async (id: string): Promise<void> => {
  try {
    const client = getClient();
    await client.del(`${CACHE_KEYS.HOST}${id}`);
  } catch (error) {
    logger.error('Failed to invalidate host cache', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      id,
    });
    throw error;
  }
};

// Health check
export const healthCheck = async (): Promise<{ status: string; connected: boolean; error?: string }> => {
  try {
    const client = getClient();
    await client.ping();
    return {
      status: 'healthy',
      connected: isConnected(),
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
initializeRedis();

export const redis = getClient();

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
};
