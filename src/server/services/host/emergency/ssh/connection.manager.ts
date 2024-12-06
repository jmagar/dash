import { Client as SSHClient } from 'ssh2';
import type { Logger, LogMetadata } from '../../../../../types/logger';
import type { Host } from '../../../../../types/host';

interface SSHConnection extends SSHClient {
  isConnected?: boolean;
}

export class ConnectionManager {
  private readonly connections = new Map<string, SSHConnection>();

  constructor(private readonly logger: Logger) {}

  /**
   * Get or create an SSH connection for a host
   */
  async getConnection(host: Host): Promise<SSHConnection> {
    const methodLogger = this.logger.withContext({ 
      operation: 'getConnection',
      hostId: host.id,
      component: 'ConnectionManager'
    });

    let ssh = this.connections.get(host.id);

    if (!ssh) {
      methodLogger.debug('Creating new SSH connection');
      ssh = new SSHClient() as SSHConnection;
      this.connections.set(host.id, ssh);
    }

    try {
      await this.ensureConnected(ssh, host);
      return ssh;
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        hostId: host.id
      };
      methodLogger.error('Failed to establish SSH connection', metadata);
      throw error;
    }
  }

  /**
   * Ensure SSH connection is established
   */
  private async ensureConnected(ssh: SSHConnection, host: Host): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (ssh.isConnected) {
        resolve();
        return;
      }

      ssh.on('ready', () => {
        ssh.isConnected = true;
        resolve();
      });

      ssh.on('error', (err) => {
        ssh.isConnected = false;
        reject(err);
      });

      ssh.on('end', () => {
        ssh.isConnected = false;
      });

      ssh.connect({
        host: host.hostname,
        port: host.port ?? 22,
        username: host.username,
        privateKey: host.privateKey,
        readyTimeout: 10000,
        keepaliveInterval: 10000
      });
    });
  }

  /**
   * Close all SSH connections
   */
  async cleanup(): Promise<void> {
    const methodLogger = this.logger.withContext({ 
      operation: 'cleanup',
      component: 'ConnectionManager'
    });

    try {
      methodLogger.info('Starting cleanup of SSH connections');
      
      await Promise.all(Array.from(this.connections.values()).map(conn => 
        new Promise<void>((resolve) => {
          conn.isConnected = false;
          conn.end();
          resolve();
        })
      ));
      this.connections.clear();

      methodLogger.info('SSH connections cleanup completed');
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error))
      };
      methodLogger.error('SSH connections cleanup failed', metadata);
      throw error;
    }
  }
}
