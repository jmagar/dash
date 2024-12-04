import { LoggingManager } from '../../managers/utils/LoggingManager';
/**
 * @deprecated This file is being replaced by the new HostService.
 * All functionality should be migrated to src/server/services/host/host.service.ts
 * TODO: Remove this file once migration is complete.
 */

import type { Host, CreateHostRequest, UpdateHostRequest } from '../../../types/models-shared';
import { ApiError } from '../../../types/error';
import { logger } from '../../utils/logger';
import { db } from '../../db';
import { Client as SSHClient } from 'ssh2';

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
    loggerLoggingManager.getInstance().();
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
    loggerLoggingManager.getInstance().();
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
    loggerLoggingManager.getInstance().();
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
    loggerLoggingManager.getInstance().();
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
    loggerLoggingManager.getInstance().();
    throw new ApiError('Failed to delete host', error);
  }
}

/**
 * Test connection to a host
 */
export async function testConnection(host: Host): Promise<void> {
  const ssh = new SSHClient();

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      ssh.end();
      reject(new Error('Connection timed out'));
    }, 10000); // 10 second timeout

    ssh.on('ready', () => {
      clearTimeout(timeout);
      ssh.end();
      resolve();
    });

    ssh.on('error', (err) => {
      clearTimeout(timeout);
      ssh.end();
      reject(new Error(`Connection failed: ${err.message}`));
    });

    try {
      ssh.connect({
        host: host.hostname,
        port: host.port,
        username: host.username,
        password: host.password,
        privateKey: host.privateKey,
        passphrase: host.passphrase,
        // Add some reasonable defaults for connection
        readyTimeout: 10000,
        keepaliveInterval: 1000,
        keepaliveCountMax: 3,
        debug: (info: string) => {
          loggerLoggingManager.getInstance().();
        },
      });
    } catch (error) {
      clearTimeout(timeout);
      reject(new Error('Failed to initiate connection'));
    }
  }).catch((error) => {
    loggerLoggingManager.getInstance().();
    throw new ApiError('Failed to test connection', error);
  });
}


