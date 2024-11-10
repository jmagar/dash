'use strict';

const Redis = require('ioredis');

const { serverLogger: logger } = require('../dist/utils/serverLogger');

let redisClient = null;

// Cache keys and expiration times
const CACHE_KEYS = {
  SESSION: 'session:',      // User sessions (30 minutes)
  USER: 'user:',           // User data (1 hour)
  COMMAND: 'command:',     // Command history (1 day)
  DOCKER: 'docker:',       // Docker state (30 seconds)
  HOST: 'host:',          // Host status (1 minute)
  MFA: 'mfa:',            // MFA verification codes (5 minutes)
};

const CACHE_TTL = {
  SESSION: 1800,    // 30 minutes
  USER: 3600,       // 1 hour
  COMMAND: 86400,   // 1 day
  DOCKER: 30,       // 30 seconds
  HOST: 60,         // 1 minute
  MFA: 300,         // 5 minutes
};

// Initialize Redis client
const initializeRedis = () => {
  try {
    logger.info('Initializing Redis client...', {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    });

    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => {
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

    redisClient.on('error', (err) => {
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
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Get Redis client (initialize if needed)
const getClient = () => {
  if (!redisClient) {
    redisClient = initializeRedis();
  }
  return redisClient;
};

// Check if Redis is connected
const isConnected = () => redisClient && redisClient.status === 'ready';

// Session caching
const cacheSession = async (token, sessionData) => {
  try {
    const client = getClient();
    await client.setex(`${CACHE_KEYS.SESSION}${token}`, CACHE_TTL.SESSION, sessionData);
    logger.debug('Session cached', { token });
  } catch (error) {
    logger.error('Failed to cache session', {
      error: error.message,
      stack: error.stack,
      token,
    });
    throw error;
  }
};

const getSession = async (token) => {
  try {
    const client = getClient();
    const data = await client.get(`${CACHE_KEYS.SESSION}${token}`);
    logger.debug('Session retrieved', { token, found: !!data });
    return data;
  } catch (error) {
    logger.error('Failed to get session', {
      error: error.message,
      stack: error.stack,
      token,
    });
    throw error;
  }
};

// Health check
const healthCheck = async () => {
  try {
    const client = getClient();
    await client.ping();
    return {
      status: 'healthy',
      connected: isConnected(),
    };
  } catch (error) {
    logger.error('Redis health check failed', {
      error: error.message,
      stack: error.stack,
    });
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message,
    };
  }
};

// Initialize Redis on module load
initializeRedis();

module.exports = {
  redis: getClient(),
  cacheSession,
  getSession,
  healthCheck,
  isConnected,
  CACHE_KEYS,
  CACHE_TTL,
};
