import { Pool, QueryResult } from 'pg';

import { logger } from './utils/logger';

// Database configuration
const DB_CONFIG = {
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  max: parseInt(process.env.POSTGRES_POOL_SIZE || '20'),
  idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECT_TIMEOUT || '10000'),
};

// Validate required config
const requiredConfig = ['user', 'password', 'host', 'database'];
for (const field of requiredConfig) {
  if (!DB_CONFIG[field]) {
    const error = `Missing required Postgres config: ${field}`;
    logger.error(error);
    throw new Error(error);
  }
}

// Create connection pool
export const pool = new Pool(DB_CONFIG);

// Log pool events
pool.on('connect', () => {
  logger.info('Database connected', {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    database: DB_CONFIG.database,
    user: DB_CONFIG.user,
  });
});

pool.on('error', (err) => {
  logger.error('Database error:', { 
    error: err.message,
    code: err.code,
    detail: err.detail,
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
  });
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
  pool,
  end,
};

export default db;
