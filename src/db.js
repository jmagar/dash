'use strict';

const path = require('path');

const { Pool } = require('pg');

// Import the common logger from src/utils
const { logger } = require(path.join(__dirname, '..', 'src', 'utils', 'logger'));

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

pool.on('error', (err) => {
  logger.error('Unexpected database error', {
    error: err.message,
    stack: err.stack,
  });
});

pool.on('remove', () => {
  logger.info('Database connection removed from pool');
});

// Query wrapper with logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
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
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Health check
const healthCheck = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed', {
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
};

// Cleanup
const cleanup = async () => {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = {
  query,
  healthCheck,
  cleanup,
  pool,
};
