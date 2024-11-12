import { Pool, PoolClient, QueryResult } from 'pg';

import { serverLogger as logger } from './utils/serverLogger';

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY = 5000; // 5 seconds

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Monitor pool events
pool.on('connect', () => {
  logger.info('New database connection established');
});

pool.on('error', (...args: unknown[]) => {
  const err = args[0] instanceof Error ? args[0] : new Error(String(args[0]));
  logger.error('Unexpected database error', {
    error: err.message,
    stack: err.stack,
  });
});

pool.on('remove', () => {
  logger.info('Database connection removed from pool');
});

// Initialize database connection with retries
export const initializeDatabase = async (): Promise<void> => {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      logger.info(`Attempting database connection (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})...`);
      await pool.query('SELECT 1');
      logger.info('Database connection established successfully');
      return;
    } catch (error) {
      logger.error('Database connection attempt failed', {
        attempt,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      if (attempt === MAX_RETRY_ATTEMPTS) {
        logger.error('Max database connection attempts reached');
        throw error;
      }

      logger.info(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
};

// Query wrapper with logging
export const query = async <T = unknown>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    logger.debug('Executed database query', {
      query: text,
      params,
      duration: `${duration}ms`,
      rowCount: result.rowCount,
    });

    return result;
  } catch (error) {
    logger.error('Database query error', {
      query: text,
      params,
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
};

// Transaction wrapper
export const transaction = async <T = unknown>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Health check
export const healthCheck = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    return false;
  }
};

// Cleanup
export const cleanup = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
};

export { pool };
