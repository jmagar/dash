const { Pool } = require('pg');
const cache = require('./cache');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,                     // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,    // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Monitor the pool events
pool.on('connect', () => {
  console.log('New client connected to database');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('remove', () => {
  console.log('Client removed from pool');
});

// Wrapper for database queries with caching
const query = async (text, params, options = {}) => {
  const {
    cache: useCache = false,
    ttl = 3600,        // Default 1 hour TTL
    key = null,        // Custom cache key
  } = options;

  // Generate cache key if not provided
  const cacheKey = key || `query:${text}:${JSON.stringify(params)}`;

  try {
    // Check cache first if enabled
    if (useCache) {
      const cachedResult = await cache.redis.get(cacheKey);
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }
    }

    // Execute query
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries (over 100ms)
    if (duration > 100) {
      console.warn('Slow query:', { text, duration, rows: res.rowCount });
    }

    // Cache result if enabled
    if (useCache) {
      await cache.redis.setex(cacheKey, ttl, JSON.stringify(res));
    }

    return res;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
};

// Transaction helper with automatic rollback
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Cache invalidation helpers
const invalidateQueryCache = async (pattern) => {
  const keys = await cache.redis.keys(`query:${pattern}*`);
  if (keys.length > 0) {
    await cache.redis.del(...keys);
  }
};

const invalidateTableCache = async (tableName) => {
  await invalidateQueryCache(`SELECT * FROM ${tableName}`);
};

// Health check
const healthCheck = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    return {
      database: {
        status: 'healthy',
        timestamp: result.rows[0].now,
      },
      cache: {
        status: cache.redis.status === 'ready' ? 'healthy' : 'unhealthy',
        connected: cache.redis.status === 'ready',
      },
    };
  } catch (err) {
    return {
      database: {
        status: 'unhealthy',
        error: err.message,
      },
      cache: {
        status: cache.redis.status === 'ready' ? 'healthy' : 'unhealthy',
        connected: cache.redis.status === 'ready',
      },
    };
  }
};

module.exports = {
  pool,
  query,
  transaction,
  invalidateQueryCache,
  invalidateTableCache,
  healthCheck,
};
