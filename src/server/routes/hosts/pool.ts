import { Client } from 'ssh2';

import type { Host, SSHConfig } from './types';
import { serverLogger as logger } from '../../../utils/serverLogger';

// Connection configuration
export const CONNECTION_TIMEOUT = 5000; // 5 seconds
export const KEEP_ALIVE_INTERVAL = 10000; // 10 seconds
export const KEEP_ALIVE_COUNT_MAX = 3;

// Host connection pool
const connectionPool = new Map<string, Client>();

export const getConnection = async (host: Host): Promise<Client> => {
  let conn = connectionPool.get(host.id);

  if (!conn) {
    conn = new Client();

    // Set up connection event handlers
    conn.on('error', (err) => {
      logger.error('SSH connection error:', {
        hostId: host.id,
        hostname: host.hostname,
        error: err.message,
      });
      connectionPool.delete(host.id);
    });

    conn.on('end', () => {
      logger.info('SSH connection ended:', { hostId: host.id, hostname: host.hostname });
      connectionPool.delete(host.id);
    });

    // Connect to host
    await new Promise<void>((resolve, reject) => {
      if (!conn) {
        reject(new Error('Failed to create SSH client'));
        return;
      }

      const handleReady = (): void => {
        conn?.removeListener('error', handleError);
        resolve();
      };

      const handleError = (err: Error): void => {
        conn?.removeListener('ready', handleReady);
        reject(err);
      };

      conn.once('ready', handleReady);
      conn.once('error', handleError);

      try {
        conn.connect({
          host: host.hostname,
          port: host.port,
          username: host.username,
          password: host.password,
          privateKey: host.private_key,
          passphrase: host.passphrase,
          readyTimeout: CONNECTION_TIMEOUT,
          keepaliveInterval: KEEP_ALIVE_INTERVAL,
          keepaliveCountMax: KEEP_ALIVE_COUNT_MAX,
        });
      } catch (err) {
        conn.removeListener('ready', handleReady);
        conn.removeListener('error', handleError);
        reject(err);
      }
    });

    connectionPool.set(host.id, conn);
  }

  return conn;
};

export const closeConnection = async (hostId: string): Promise<void> => {
  const conn = connectionPool.get(hostId);
  if (conn) {
    try {
      conn.end();
    } catch (error) {
      logger.warn('Error closing SSH connection:', {
        hostId,
        error: (error as Error).message,
      });
    }
    connectionPool.delete(hostId);
  }
};

export const testSSHConnection = async (config: SSHConfig): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const conn = new Client();
    let timeoutHandle: NodeJS.Timeout | undefined;

    const cleanup = (): void => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
      }
      conn.removeAllListeners();
      try {
        conn.end();
      } catch (err) {
        logger.warn('Error during connection cleanup:', { error: (err as Error).message });
      }
    };

    timeoutHandle = setTimeout(() => {
      cleanup();
      reject(new Error(`Connection timed out after ${CONNECTION_TIMEOUT/1000} seconds`));
    }, CONNECTION_TIMEOUT);

    conn.once('ready', () => {
      cleanup();
      resolve();
    });

    conn.once('error', (err) => {
      cleanup();
      // Enhance error message for common issues
      if (err.message.includes('ECONNREFUSED')) {
        reject(new Error('Connection refused. Please check if the host is running and accessible.'));
      } else if (err.message.includes('ETIMEDOUT')) {
        reject(new Error('Connection timed out. Please check your network connection and host availability.'));
      } else if (err.message.includes('Authentication failed')) {
        reject(new Error('Authentication failed. Please check your credentials.'));
      } else {
        reject(err);
      }
    });

    try {
      conn.connect({
        ...config,
        readyTimeout: CONNECTION_TIMEOUT,
        keepaliveInterval: KEEP_ALIVE_INTERVAL,
        keepaliveCountMax: KEEP_ALIVE_COUNT_MAX,
      });
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
};
