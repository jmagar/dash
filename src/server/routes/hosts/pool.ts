import { Client } from 'ssh2';
import type { Host } from '../../../types/models-shared';
import { logger } from '../../utils/logger';

const connections = new Map<string, Client>();

export async function getConnection(host: Host): Promise<Client> {
  const key = `${host.hostname}:${host.port}`;
  let client = connections.get(key);

  if (!client) {
    client = new Client();
    connections.set(key, client);

    await new Promise<void>((resolve, reject) => {
      client.on('ready', () => {
        logger.info('SSH connection established', { host: key });
        resolve();
      });

      client.on('error', (error) => {
        logger.error('SSH connection error:', {
          host: key,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        reject(error);
      });

      client.connect({
        host: host.hostname,
        port: host.port,
        username: host.username,
        password: host.password,
      });
    });
  }

  return client;
}

export async function closeConnection(host: Host): Promise<void> {
  const key = `${host.hostname}:${host.port}`;
  const client = connections.get(key);

  if (client) {
    client.end();
    connections.delete(key);
    logger.info('SSH connection closed', { host: key });
  }
}

export async function closeAllConnections(): Promise<void> {
  for (const [key, client] of connections.entries()) {
    client.end();
    logger.info('SSH connection closed', { host: key });
  }
  connections.clear();
}
