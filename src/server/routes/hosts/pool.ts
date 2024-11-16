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
      logger.info('SSH connection established', {
        host: host.hostname,
        port: host.port,
        username: host.username,
      });
      resolve(client);
    });

    client.on('error', (error) => {
      logger.error('SSH connection error:', {
        host: host.hostname,
        port: host.port,
        username: host.username,
        error: error.message,
      });
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

/**
 * Close an SSH connection
 */
export async function closeConnection(host: Host): Promise<void> {
  const key = `${host.hostname}:${host.port}`;
  const client = connections.get(key);

  if (client) {
    client.end();
    connections.delete(key);
    logger.info('SSH connection closed', {
      host: host.hostname,
      port: host.port,
      username: host.username,
    });
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
  logger.info('All SSH connections closed');
}
