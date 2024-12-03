import { Pool, QueryResult, PoolConfig } from 'pg';
import config from './config';
import { LoggingManager } from '../utils/logging/LoggingManager';
import { metrics } from './metrics';

// Database configuration
const poolConfig: PoolConfig = {
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Validate required config
const requiredConfig = ['user', 'password', 'host', 'database'] as const;
for (const field of requiredConfig) {
  if (!poolConfig[field]) {
    const error = `Missing required Postgres config: ${field}`;
    LoggingManager.getInstance().error(error);
    throw new Error(error);
  }
}

// Create connection pool
const pool = new Pool(poolConfig);

// Pool error handler
pool.on('error', (err: unknown) => {
  const error = err instanceof Error ? err : new Error(String(err));
  LoggingManager.getInstance().error('Unexpected error on idle client', {
    error: error.message,
    stack: error.stack,
  });
  metrics.apiErrors.inc({ error_type: 'database_error' });
});

// Pool event handlers
pool.on('connect', () => {
  LoggingManager.getInstance().info('New client connected to database');
  metrics.hostMetrics.set({ metric_type: 'db_connections' }, pool.totalCount);
});

pool.on('acquire', () => {
  LoggingManager.getInstance().debug('Client checked out from pool');
  metrics.hostMetrics.set({ metric_type: 'db_acquires' }, pool.totalCount);
});

pool.on('remove', () => {
  LoggingManager.getInstance().info('Client removed from pool');
  metrics.hostMetrics.set({ metric_type: 'db_connections' }, pool.totalCount - 1);
});

/**
 * Execute a database query with proper error handling and metrics
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[],
  options?: { timeout?: number }
): Promise<QueryResult<T>> {
  const start = Date.now();
  const client = await pool.connect();

  try {
    // Set statement timeout if specified
    if (options?.timeout) {
      await client.query(`SET statement_timeout TO ${options.timeout}`);
    }

    const result = await client.query<T>(text, params);
    const duration = Date.now() - start;

    // Record metrics
    metrics.hostMetrics.set({ metric_type: 'db_query_duration' }, duration);
    
    LoggingManager.getInstance().debug('Executed query:', {
      text,
      duration,
      rows: result.rowCount,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    LoggingManager.getInstance().error('Query error:', {
      text,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      params,
      duration,
    });

    metrics.apiErrors.inc({ error_type: 'database_query_error' });
    throw error;
  } finally {
    // Reset statement timeout if it was set
    if (options?.timeout) {
      await client.query('RESET statement_timeout').catch(err => {
        LoggingManager.getInstance().error('Error resetting statement timeout', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });
    }
    
    client.release();
  }
}

/**
 * Database health check with detailed diagnostics
 */
export async function healthCheck(): Promise<{
  status: string;
  connected: boolean;
  poolSize?: number;
  waitingCount?: number;
  idleCount?: number;
  error?: string;
}> {
  try {
    await pool.query('SELECT 1');
    return {
      status: 'ok',
      connected: true,
      poolSize: pool.totalCount,
      waitingCount: pool.waitingCount,
      idleCount: pool.idleCount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    LoggingManager.getInstance().error('Database health check failed:', { error: errorMessage });
    metrics.apiErrors.inc({ error_type: 'database_health_check_error' });
    
    return {
      status: 'error',
      connected: false,
      error: errorMessage,
    };
  }
}

/**
 * Gracefully close all database connections
 */
export async function end(): Promise<void> {
  try {
    await pool.end();
    LoggingManager.getInstance().info('Database connections closed');
  } catch (error) {
    LoggingManager.getInstance().error('Error closing database connections:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// Export database interface with proper typing
interface DatabaseInterface {
  query: typeof query;
  healthCheck: typeof healthCheck;
  end: typeof end;
  totalCount: () => number;
  idleCount: () => number;
  waitingCount: () => number;
}

export const db: DatabaseInterface = {
  query,
  healthCheck,
  end,
  totalCount: () => pool.totalCount,
  idleCount: () => pool.idleCount,
  waitingCount: () => pool.waitingCount,
};

export default db;

