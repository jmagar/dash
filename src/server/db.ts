import { Pool, type PoolConfig, type QueryResult } from 'pg';
import { config } from './config';
import { logger } from './utils/logger';

// Database configuration
const poolConfig: PoolConfig = {
  user: config.db.user,
  password: config.db.password,
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Validate required config
const requiredConfig = ['user', 'password', 'host', 'database'] as const;
for (const field of requiredConfig) {
  if (!poolConfig[field]) {
    const error = `Missing required Postgres config: ${field}`;
    logger.error(error);
    throw new Error(error);
  }
}

// Create connection pool
const pool = new Pool(poolConfig);

// Log pool events
pool.on('error', (...args: unknown[]) => {
  const error = args[0];
  logger.error('Unexpected error on idle client', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
});

pool.on('connect', () => {
  logger.info('New client connected to database');
});

pool.on('acquire', () => {
  logger.debug('Client checked out from pool');
});

pool.on('remove', () => {
  logger.info('Client removed from pool');
});

/**
 * Execute a database query
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query:', {
      text,
      duration,
      rows: result.rowCount,
    });
    return result;
  } catch (error) {
    logger.error('Query error:', {
      text,
      error: error instanceof Error ? error.message : 'Unknown error',
      params,
    });
    throw error;
  }
}

/**
 * Health check function
 */
export async function healthCheck(): Promise<{
  status: string;
  connected: boolean;
  error?: string;
}> {
  try {
    await pool.query('SELECT 1');
    return {
      status: 'ok',
      connected: true,
    };
  } catch (error) {
    return {
      status: 'error',
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Close all database connections
 */
export async function end(): Promise<void> {
  await pool.end();
}

// Export database interface
export const db = {
  query,
  healthCheck,
  end,
  totalCount: () => pool.totalCount,
  idleCount: () => pool.idleCount,
  waitingCount: () => pool.waitingCount,
};

export default db;
