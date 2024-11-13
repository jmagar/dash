import type { QueryResult } from 'pg';

import type { Host, CreateHostRequest, UpdateHostRequest } from './types';
import { createApiError } from '../../../types/error';
import type { LogMetadata } from '../../../types/logger';
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
export async function getHostById(id: string): Promise<Host | null> {
  try {
    // Check cache first
    const cachedHost = await cache.getHostStatus(id);
    if (cachedHost) {
      return cachedHost as Host;
    }

    // If not in cache, get from database
    const result: QueryResult<Host> = await db.query(
      'SELECT * FROM hosts WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }

    // Cache the result
    const host = result.rows[0];
    await cache.cacheHostStatus(id, host);

    return host;
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to get host:', metadata);
    throw createApiError('Failed to get host', 500, metadata);
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

    const host = result.rows[0];
    await cache.cacheHostStatus(host.id, host);

    return host;
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
export async function updateHost(id: string, data: UpdateHostRequest): Promise<Host> {
  try {
    const result: QueryResult<Host> = await db.query(
      'UPDATE hosts SET name = $1, hostname = $2, port = $3, username = $4 WHERE id = $5 RETURNING *',
      [data.name, data.hostname, data.port, data.username, id],
    );

    if (result.rows.length === 0) {
      throw createApiError('Host not found', 404);
    }

    const host = result.rows[0];
    await cache.cacheHostStatus(id, host);

    return host;
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: id,
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
export async function deleteHost(id: string): Promise<void> {
  try {
    const result: QueryResult<Host> = await db.query(
      'DELETE FROM hosts WHERE id = $1 RETURNING *',
      [id],
    );

    if (result.rows.length === 0) {
      throw createApiError('Host not found', 404);
    }

    // Invalidate cache
    await cache.invalidateHostCache(id);
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to delete host:', metadata);
    throw createApiError('Failed to delete host', 500, metadata);
  }
}
