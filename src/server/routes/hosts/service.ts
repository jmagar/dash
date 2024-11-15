import { createApiError } from '../../../types/error';
import type { LogMetadata } from '../../../types/logger';
import type { CreateHostRequest, Host, SystemStats } from '../../../types/models-shared';
import { cacheService } from '../../cache/CacheService';
import { db } from '../../db';
import { logger } from '../../utils/logger';

export async function listHosts(userId: string): Promise<Host[]> {
  try {
    const result = await db.query<Host>(
      'SELECT * FROM hosts WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Failed to list hosts:', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to list hosts', error);
  }
}

export async function getHost(userId: string, hostId: number): Promise<Host> {
  try {
    const result = await db.query<Host>(
      'SELECT * FROM hosts WHERE id = $1 AND user_id = $2',
      [hostId, userId]
    );

    if (result.rows.length === 0) {
      throw createApiError('Host not found', null, 404);
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to get host:', {
      userId,
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get host', error);
  }
}

export async function getHostStats(userId: string, hostId: number): Promise<SystemStats> {
  try {
    const host = await getHost(userId, hostId);
    const statsData = await cacheService.getSession(`stats:${host.id}`);

    if (!statsData) {
      throw createApiError('No stats available for host', null, 404);
    }

    let stats: SystemStats;
    try {
      stats = JSON.parse(statsData);
    } catch (error) {
      const metadata: LogMetadata = {
        userId,
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to parse host stats:', metadata);
      throw createApiError('Invalid stats data', error);
    }

    return stats;
  } catch (error) {
    logger.error('Failed to get host stats:', {
      userId,
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get host stats', error);
  }
}

export async function createHost(userId: string, host: CreateHostRequest): Promise<Host> {
  try {
    const result = await db.query<Host>(
      `INSERT INTO hosts (
        user_id,
        name,
        hostname,
        port,
        username,
        password,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
      [
        userId,
        host.name,
        host.hostname,
        host.port,
        host.username,
        host.password,
        'disconnected',
      ]
    );

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to create host:', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to create host', error);
  }
}

export async function updateHost(userId: string, hostId: number, updates: Partial<Host>): Promise<Host> {
  try {
    const host = await getHost(userId, hostId);

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
        updates.name || host.name,
        updates.hostname || host.hostname,
        updates.port || host.port,
        updates.username || host.username,
        updates.password || host.password,
        hostId,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      throw createApiError('Host not found', null, 404);
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to update host:', {
      userId,
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to update host', error);
  }
}

export async function deleteHost(userId: string, hostId: number): Promise<void> {
  try {
    const result = await db.query(
      'DELETE FROM hosts WHERE id = $1 AND user_id = $2',
      [hostId, userId]
    );

    if (result.rowCount === 0) {
      throw createApiError('Host not found', null, 404);
    }

    // Clear cached data
    await cacheService.removeSession(`stats:${hostId}`);
  } catch (error) {
    logger.error('Failed to delete host:', {
      userId,
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to delete host', error);
  }
}

export async function testHost(host: CreateHostRequest): Promise<boolean> {
  try {
    // TODO: Implement actual SSH connection test
    return true;
  } catch (error) {
    logger.error('Failed to test host:', {
      hostname: host.hostname,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to test host', error);
  }
}
