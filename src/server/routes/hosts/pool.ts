import { Client } from 'ssh2';

import { logger } from '../../utils/logger';

interface SSHConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  readyTimeout?: number;
  keepaliveInterval?: number;
  keepaliveCountMax?: number;
}

/**
 * Test SSH connection to a host
 */
export async function testSSHConnection(config: SSHConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = new Client();

    client.on('ready', () => {
      logger.debug('SSH connection test successful:', {
        host: config.host,
        port: config.port,
      });
      client.end();
      resolve();
    });

    client.on('error', (err) => {
      logger.error('SSH connection test failed:', {
        host: config.host,
        port: config.port,
        error: err.message,
      });
      reject(err);
    });

    try {
      client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
        readyTimeout: config.readyTimeout,
        keepaliveInterval: config.keepaliveInterval,
        keepaliveCountMax: config.keepaliveCountMax,
      });
    } catch (error) {
      logger.error('SSH connection setup failed:', {
        host: config.host,
        port: config.port,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      reject(error);
    }
  });
}

export default {
  testSSHConnection,
};
