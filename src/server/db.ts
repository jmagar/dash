import { Pool, QueryResult } from 'pg';

import { logger } from './utils/logger';

// Database configuration
const DB_CONFIG = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'shh',
  max: parseInt(process.env.DB_POOL_SIZE || '20'),
  idleTimeoutMillis: 30000,
};

// Create connection pool
export const pool = new Pool(DB_CONFIG);

// Log pool events
pool.on('connect', () => {
  logger.info('Database connected');
});

pool.on('error', (err) => {
  logger.error('Database error:', { error: err });
});

/**
 * Execute a database query
 */
export async function query<T = any>(
  text: string,
  params?: any[],
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

// Export database interface
export const db = {
  query,
  healthCheck,
  pool,
};

export default db;
