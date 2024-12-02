import { Client } from 'ssh2';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import type { Host, CommandResult } from '../../types/models-shared';
import type { LogMetadata } from '../../types/logger';
import { db } from '../db';
import { ApiError } from '../../types/error';

interface SSHConnection {
  client: Client;
  connected: boolean;
  lastUsed: Date;
  reconnectAttempts: number;
}

interface SSHError extends Error {
  level?: string;
  code?: string;
}

export class SSHService extends EventEmitter {
  private connections: Map<string, SSHConnection> = new Map();
  private readonly connectionTimeout = 30000; // 30 seconds
  private readonly maxIdleTime = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [hostId, connection] of this.connections) {
        if (now - connection.lastUsed.getTime() > this.maxIdleTime) {
          this.disconnect(hostId);
        }
      }
    }, 60000); // Check every minute
  }

  private async getConnection(host: Host): Promise<Client> {
    const existing = this.connections.get(host.id);
    if (existing?.connected) {
      existing.lastUsed = new Date();
      return existing.client;
    }

    const client = new Client();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end();
        reject(new Error('Connection timeout'));
      }, this.connectionTimeout);

      client.on('ready', () => {
        clearTimeout(timeout);
        this.connections.set(host.id, {
          client,
          connected: true,
          lastUsed: new Date(),
          reconnectAttempts: 0
        });
        resolve(client);
      });

      client.on('error', (err: SSHError) => {
        clearTimeout(timeout);
        const metadata: LogMetadata = {
          error: err.message,
          code: err.code,
          level: err.level,
          hostname: host.hostname
        };
        logger.error('SSH connection error', metadata);
        reject(new ApiError(`Failed to connect to host: ${err.message}`, 500));
      });

      client.on('end', () => {
        const connection = this.connections.get(host.id);
        if (connection) {
          connection.connected = false;
          logger.info('SSH connection ended', { hostname: host.hostname });
        }
      });

      client.connect({
        host: host.hostname,
        port: host.port,
        username: host.username,
        password: host.password,
        privateKey: host.privateKey,
        passphrase: host.passphrase,
      });
    });
  }

  public async executeCommand(hostname: string, command: string): Promise<CommandResult> {
    const host = await this.getHost(hostname);
    if (!host) {
      throw new Error(`Host ${hostname} not found`);
    }

    const startTime = Date.now();
    const client = await this.getConnection(host);

    return new Promise((resolve, reject) => {
      client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.on('error', (err: SSHError) => {
          const metadata: LogMetadata = {
            error: err.message,
            code: err.code,
            level: err.level,
            hostname: host.hostname,
            command
          };
          logger.error('SSH command execution error', metadata);
          reject(new ApiError(`Command execution failed: ${err.message}`, 500));
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on('close', (code: number) => {
          const endTime = Date.now();
          resolve({
            exitCode: code,
            stdout,
            stderr,
            duration: endTime - startTime,
            error: code !== 0 ? stderr : undefined,
            status: code === 0 ? 'completed' : 'failed',
            startedAt: new Date(startTime),
            completedAt: new Date(endTime)
          });
        });
      });
    });
  }

  public async transferFile(hostname: string, localPath: string, remotePath: string): Promise<void> {
    const host = await this.getHost(hostname);
    if (!host) {
      throw new ApiError(`Host ${hostname} not found`, 404);
    }

    const client = await this.getConnection(host);

    return new Promise((resolve, reject) => {
      client.sftp((err: Error | null, sftp) => {
        if (err) {
          const metadata: LogMetadata = {
            error: err.message,
            hostname,
            localPath,
            remotePath
          };
          logger.error('Failed to create SFTP session', metadata);
          reject(new ApiError(`Failed to create SFTP session: ${err.message}`, 500));
          return;
        }

        if (!sftp) {
          reject(new ApiError('SFTP session is undefined', 500));
          return;
        }

        sftp.fastPut(localPath, remotePath, (err: Error | null) => {
          if (err) {
            const metadata: LogMetadata = {
              error: err.message,
              hostname,
              localPath,
              remotePath
            };
            logger.error('Failed to transfer file', metadata);
            reject(new ApiError(`Failed to transfer file: ${err.message}`, 500));
            return;
          }
          resolve();
        });
      });
    });
  }

  public async withSSH<T>(
    hostname: string, 
    callback: (client: Client) => Promise<T>
  ): Promise<T> {
    const host = await this.getHost(hostname);
    if (!host) {
      throw new ApiError(`Host ${hostname} not found`, 404);
    }

    const client = await this.getConnection(host);
    try {
      return await callback(client);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostname: host.hostname
      };
      logger.error('SSH operation failed', metadata);
      throw new ApiError(`SSH operation failed: ${error instanceof Error ? error.message : String(error)}`, 500);
    } finally {
      // Don't disconnect - connection is managed by connection pool
    }
  }

  public disconnect(hostId: string): void {
    const connection = this.connections.get(hostId);
    if (connection) {
      connection.client.end();
      connection.connected = false;
      this.connections.delete(hostId);
    }
  }

  public disconnectAll(): void {
    for (const [hostId] of this.connections) {
      this.disconnect(hostId);
    }
  }

  private async getHost(hostname: string): Promise<Host | null> {
    try {
      const result = await db.query<Host>(
        'SELECT * FROM hosts WHERE hostname = $1',
        [hostname]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get host from database', {
        error: error instanceof Error ? error.message : String(error),
        hostname
      });
      throw new ApiError('Failed to get host from database', 500);
    }
  }
}

// Export singleton instance
export const sshService = new SSHService();
