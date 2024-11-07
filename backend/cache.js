const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

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

// Session caching
const cacheSession = async (userId, sessionData) => {
  const key = `${CACHE_KEYS.SESSION}${userId}`;
  await redis.setex(key, CACHE_TTL.SESSION, JSON.stringify(sessionData));
};

const getSession = async (userId) => {
  const key = `${CACHE_KEYS.SESSION}${userId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

// User data caching
const cacheUser = async (userId, userData) => {
  const key = `${CACHE_KEYS.USER}${userId}`;
  await redis.setex(key, CACHE_TTL.USER, JSON.stringify(userData));
};

const getUser = async (userId) => {
  const key = `${CACHE_KEYS.USER}${userId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

// Command history caching
const cacheCommand = async (userId, hostId, command) => {
  const key = `${CACHE_KEYS.COMMAND}${userId}:${hostId}`;
  const commands = await redis.lrange(key, 0, -1);
  await redis.lpush(key, JSON.stringify(command));
  await redis.ltrim(key, 0, 99); // Keep last 100 commands
  await redis.expire(key, CACHE_TTL.COMMAND);
};

const getCommands = async (userId, hostId) => {
  const key = `${CACHE_KEYS.COMMAND}${userId}:${hostId}`;
  const commands = await redis.lrange(key, 0, -1);
  return commands.map(cmd => JSON.parse(cmd));
};

// Docker state caching
const cacheDockerState = async (hostId, state) => {
  const key = `${CACHE_KEYS.DOCKER}${hostId}`;
  await redis.setex(key, CACHE_TTL.DOCKER, JSON.stringify(state));
};

const getDockerState = async (hostId) => {
  const key = `${CACHE_KEYS.DOCKER}${hostId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

// Host status caching
const cacheHostStatus = async (hostId, status) => {
  const key = `${CACHE_KEYS.HOST}${hostId}`;
  await redis.setex(key, CACHE_TTL.HOST, JSON.stringify(status));
};

const getHostStatus = async (hostId) => {
  const key = `${CACHE_KEYS.HOST}${hostId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

// MFA verification caching
const cacheMfaCode = async (userId, code) => {
  const key = `${CACHE_KEYS.MFA}${userId}`;
  await redis.setex(key, CACHE_TTL.MFA, code);
};

const getMfaCode = async (userId) => {
  const key = `${CACHE_KEYS.MFA}${userId}`;
  return await redis.get(key);
};

// Cache invalidation
const invalidateUserCache = async (userId) => {
  const keys = [
    `${CACHE_KEYS.SESSION}${userId}`,
    `${CACHE_KEYS.USER}${userId}`,
    `${CACHE_KEYS.MFA}${userId}`,
  ];
  await redis.del(...keys);
};

const invalidateHostCache = async (hostId) => {
  const keys = [
    `${CACHE_KEYS.DOCKER}${hostId}`,
    `${CACHE_KEYS.HOST}${hostId}`,
  ];
  await redis.del(...keys);
};

module.exports = {
  redis,
  cacheSession,
  getSession,
  cacheUser,
  getUser,
  cacheCommand,
  getCommands,
  cacheDockerState,
  getDockerState,
  cacheHostStatus,
  getHostStatus,
  cacheMfaCode,
  getMfaCode,
  invalidateUserCache,
  invalidateHostCache,
};
