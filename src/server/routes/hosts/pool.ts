import { LoggingManager } from '../../managers/LoggingManager';
import { LogMetadata } from '../../../types/logger';
import type { Host } from '../../../types/models-shared';
import { Client as SSHClient } from 'ssh2';

const logger = LoggingManager.getInstance();

interface HostConnection {
  host: Host;
  client: SSHClient;
  lastActivity: Date;
}

const connections = new Map<string, HostConnection>();

function getConnectionKey(host: Host): string {
  return `${host.id}:${host.hostname}:${host.port}`;
}

export async function getConnection(host: Host): Promise<SSHClient> {
  const key = getConnectionKey(host);
  const existing = connections.get(key);

  if (existing) {
    existing.lastActivity = new Date();
    return existing.client;
  }

  logger.info('Creating new SSH connection', {
    hostId: host.id,
    hostname: host.hostname
  } as LogMetadata);

  const client = new SSHClient();
  
  return new Promise<SSHClient>((resolve, reject) => {
    client.on('ready', () => {
      connections.set(key, {
        host,
        client,
        lastActivity: new Date()
      });
      resolve(client);
    });

    client.on('error', (error) => {
      logger.error('SSH connection error', {
        hostId: host.id,
        error
      } as LogMetadata);
      reject(error);
    });

    void client.connect({
      host: host.hostname,
      port: host.port,
      username: host.username,
      privateKey: host.privateKey
    });
  });
}

export async function handleHostError(host: Host, error: Error): Promise<void> {
  const key = getConnectionKey(host);
  const connection = connections.get(key);

  if (connection) {
    logger.error('Host connection error', {
      hostId: host.id,
      error
    } as LogMetadata);

    await closeConnection(host);
  }

  logger.error('Host error handling complete', {
    hostId: host.id,
    error
  } as LogMetadata);
}

export async function closeConnection(host: Host): Promise<void> {
  const key = getConnectionKey(host);
  const connection = connections.get(key);

  if (connection) {
    logger.info('Closing SSH connection', {
      hostId: host.id,
      hostname: host.hostname
    } as LogMetadata);

    connection.client.end();
    connections.delete(key);
  }
}

export async function closeAllConnections(): Promise<void> {
  for (const [key, connection] of connections) {
    logger.info('Closing SSH connection', {
      hostId: connection.host.id,
      hostname: connection.host.hostname
    } as LogMetadata);

    connection.client.end();
    connections.delete(key);
  }
}

// Start cleanup interval
setInterval(() => {
  const now = new Date();
  for (const [key, connection] of connections) {
    const inactiveTime = now.getTime() - connection.lastActivity.getTime();
    if (inactiveTime > 5 * 60 * 1000) { // 5 minutes
      logger.info('Closing inactive SSH connection', {
        hostId: connection.host.id,
        hostname: connection.host.hostname,
        inactiveTime
      } as LogMetadata);

      connection.client.end();
      connections.delete(key);
    }
  }
}, 60 * 1000); // Check every minute
