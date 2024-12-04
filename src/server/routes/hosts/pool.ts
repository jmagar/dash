import { LoggingManager } from '../../managers/utils/LoggingManager';
/**
 * @deprecated This file is being replaced by the new HostService.
 * All functionality should be migrated to src/server/services/host/host.service.ts
 * TODO: Remove this file once migration is complete.
 */

import { Client } from 'ssh2';
import type { Host } from '../../../types/models-shared';
import { logger } from '../../utils/logger';

// Connection pool to reuse SSH connections
const connections = new Map<string, Client>();

/**
 * Get an SSH connection to a host
 */
export async function getConnection(host: Host): Promise<Client> {
  const key = `${host.hostname}:${host.port}`;
  const existingClient = connections.get(key);

  if (existingClient) {
    return existingClient;
  }

  const client = new Client();
  connections.set(key, client);

  return new Promise((resolve, reject) => {
    client.on('ready', () => {
      loggerLoggingManager.getInstance().();
      resolve(client);
    });

    client.on('error', async (error) => {
      await handleHostError(host, error);
      connections.delete(key);
      reject(error);
    });

    client.connect({
      host: host.hostname,
      port: host.port,
      username: host.username,
      password: host.password,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
      readyTimeout: 20000,
      debug: process.env.NODE_ENV === 'development' ? console.log : undefined,
    });
  });
}

async function handleHostError(host: Host, error: Error): Promise<void> {
  const metadata = {
    hostId: host.id,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  };

  // Critical notification if host is unreachable
  if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
    logger.critical(`Host ${host.name} is unreachable`, {
      ...metadata,
      notify: true,
    });
  } else {
    loggerLoggingManager.getInstance().();
  }

  host.status = 'error';
  host.metadata = {
    ...host.metadata,
    lastError: {
      message: error.message,
      timestamp: new Date().toISOString()
    }
  };
  // Assuming hostService is defined somewhere
  // await this.hostService.updateHost(host);
}

/**
 * Close an SSH connection
 */
export async function closeConnection(host: Host): Promise<void> {
  const key = `${host.hostname}:${host.port}`;
  const client = connections.get(key);

  if (client) {
    client.end();
    connections.delete(key);
    loggerLoggingManager.getInstance().();
  }
}

/**
 * Close all SSH connections
 */
export async function closeAllConnections(): Promise<void> {
  for (const [key, client] of connections.entries()) {
    client.end();
    connections.delete(key);
  }
  loggerLoggingManager.getInstance().();
}


