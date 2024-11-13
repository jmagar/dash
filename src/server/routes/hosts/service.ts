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
    const result: QueryResult<Host> = await db.query('SELECT * FROM hosts ORDER BY name');
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
    const result: QueryResult<Host> = await db.query(
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
    const stats = await cache.getHostStatus(String(id));
    return stats as SystemStats | null;
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
export async function createHost(data: CreateHostRequest): Promise<Host> {
  try {
    const result: QueryResult<Host> = await db.query(
      'INSERT INTO hosts (name, hostname, port, username) VALUES ($1, $2, $3, $4) RETURNING *',
      [data.name, data.hostname, data.port, data.username],
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
export async function updateHost(id: number, data: UpdateHostRequest): Promise<Host> {
  try {
    const result: QueryResult<Host> = await db.query(
      'UPDATE hosts SET name = $1, hostname = $2, port = $3, username = $4 WHERE id = $5 RETURNING *',
      [data.name, data.hostname, data.port, data.username, id],
    );

    if (result.rows.length === 0) {
      throw createApiError('Host not found', 404);
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
    const result: QueryResult<Host> = await db.query(
      'DELETE FROM hosts WHERE id = $1 RETURNING *',
      [id],
    );

    if (result.rows.length === 0) {
      throw createApiError('Host not found', 404);
    }

    // Invalidate cache
    await cache.invalidateHostCache(String(id));
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(id),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to delete host:', metadata);
    throw createApiError('Failed to delete host', 500, metadata);
  }
}
