import type { Host, CreateHostRequest, UpdateHostRequest } from '../../../types/models-shared';
import { ApiError } from '../../../types/error';
import { logger } from '../../utils/logger';
import { db } from '../../db';

/**
 * List all hosts for a user
 */
export async function listHosts(userId: string): Promise<Host[]> {
  try {
    const result = await db.query<Host>(
      'SELECT * FROM hosts WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Failed to list hosts:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    throw new ApiError('Failed to list hosts', error);
  }
}

/**
 * Get a specific host by ID
 */
export async function getHost(userId: string, id: string): Promise<Host | null> {
  try {
    const result = await db.query<Host>(
      'SELECT * FROM hosts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to get host:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      hostId: id,
    });
    throw new ApiError('Failed to get host', error);
  }
}

/**
 * Create a new host
 */
export async function createHost(userId: string, data: CreateHostRequest): Promise<Host> {
  try {
    const result = await db.query<Host>(
      `INSERT INTO hosts (
        user_id,
        name,
        hostname,
        port,
        username,
        password,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
      [
        userId,
        data.name,
        data.hostname,
        data.port,
        data.username,
        data.password,
      ]
    );

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to create host:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    throw new ApiError('Failed to create host', error);
  }
}

/**
 * Update an existing host
 */
export async function updateHost(userId: string, id: string, data: UpdateHostRequest): Promise<Host | null> {
  try {
    const result = await db.query<Host>(
      `UPDATE hosts SET
        name = COALESCE($1, name),
        hostname = COALESCE($2, hostname),
        port = COALESCE($3, port),
        username = COALESCE($4, username),
        password = COALESCE($5, password),
        updated_at = NOW()
      WHERE id = $6 AND user_id = $7
      RETURNING *`,
      [
        data.name,
        data.hostname,
        data.port,
        data.username,
        data.password,
        id,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to update host:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      hostId: id,
    });
    throw new ApiError('Failed to update host', error);
  }
}

/**
 * Delete a host
 */
export async function deleteHost(userId: string, id: string): Promise<void> {
  try {
    const result = await db.query(
      'DELETE FROM hosts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rowCount === 0) {
      throw new ApiError('Host not found', null, 404);
    }
  } catch (error) {
    logger.error('Failed to delete host:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      hostId: id,
    });
    throw new ApiError('Failed to delete host', error);
  }
}

/**
 * Test connection to a host
 */
export async function testConnection(host: Host): Promise<void> {
  try {
    // TODO: Implement actual SSH connection test
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    logger.error('Failed to test host connection:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId: host.id.toString(),
    });
    throw new ApiError('Failed to test connection', error);
  }
}
