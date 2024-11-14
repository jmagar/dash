import type { QueryResult } from 'pg';

import { createApiError } from '../../../types/error';
import type { LogMetadata } from '../../../types/logger';
import type { Host, CreateHostRequest, UpdateHostRequest, SystemStats } from '../../../types/models-shared';
import cache from '../../cache';
import { db } from '../../db';
import { logger } from '../../utils/logger';

/**
 * Get all hosts
 */
export async function getAllHosts(): Promise<Host[]> {
  try {
    const result: QueryResult<Host> = await db.query<Host>('SELECT * FROM hosts ORDER BY name');
    return result.rows;
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to get hosts:', metadata);
    throw createApiError('Failed to get hosts', 500, metadata);
  }
}

/**
 * Get host by ID
 */
export async function getHostById(id: number): Promise<Host | null> {
  try {
    // Get from database
    const result: QueryResult<Host> = await db.query<Host>(
      'SELECT * FROM hosts WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(id),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to get host:', metadata);
    throw createApiError('Failed to get host', 500, metadata);
  }
}

/**
 * Get host status
 */
export async function getHostStatus(id: number): Promise<SystemStats | null> {
  try {
    // Get host status from cache
    const hostData = await cache.getHost(String(id));
    return hostData as SystemStats | null;
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(id),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to get host status:', metadata);
    throw createApiError('Failed to get host status', 500, metadata);
  }
}

/**
 * Create new host
 */
export async function createHost(data: Omit<Host, 'id'>): Promise<Host> {
  try {
    const result: QueryResult<Host> = await db.query<Host>(
      'INSERT INTO hosts (name, hostname, port, username, password) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [data.name, data.hostname, data.port, data.username, data.password],
    );

    return result.rows[0];
  } catch (error) {
    const metadata: LogMetadata = {
      data,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to create host:', metadata);
    throw createApiError('Failed to create host', 500, metadata);
  }
}

/**
 * Update host
 */
export async function updateHost(id: number, data: Partial<Host>): Promise<Host> {
  try {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        setClauses.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    values.push(id);
    const query = `UPDATE hosts SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result: QueryResult<Host> = await db.query<Host>(query, values);

    if (!result.rows[0]) {
      throw new Error('Host not found');
    }

    return result.rows[0];
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(id),
      data,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to update host:', metadata);
    throw createApiError('Failed to update host', 500, metadata);
  }
}

/**
 * Delete host
 */
export async function deleteHost(id: number): Promise<void> {
  try {
    const result = await db.query('DELETE FROM hosts WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      throw new Error('Host not found');
    }

    // Invalidate host cache
    await cache.removeHost(String(id));
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(id),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to delete host:', metadata);
    throw createApiError('Failed to delete host', 500, metadata);
  }
}

/**
 * List all hosts
 */
export async function listHosts(): Promise<Host[]> {
  try {
    const result: QueryResult<Host> = await db.query<Host>('SELECT * FROM hosts ORDER BY name');
    return result.rows;
  } catch (error) {
    logger.error('Failed to list hosts:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to list hosts', error instanceof Error ? error : new Error('Unknown error'));
  }
}

/**
 * Get host by ID
 */
export async function getHost(id: number): Promise<Host | null> {
  try {
    const result: QueryResult<Host> = await db.query<Host>('SELECT * FROM hosts WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to get host:', {
      hostId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get host', error instanceof Error ? error : new Error('Unknown error'));
  }
}

/**
 * Test host connection
 */
export async function testHost(host: Host): Promise<void> {
  logger.info('Testing host connection', { hostId: host.id });
  // TODO: Implement host testing
}
