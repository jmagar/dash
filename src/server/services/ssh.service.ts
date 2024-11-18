import { Client } from 'ssh2';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import type { Host , CommandResult } from '../../types/models-shared';

interface SSHConnection {
  client: Client;
  connected: boolean;
  lastUsed: Date;
}

class SSHService extends EventEmitter {
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
        });
        resolve(client);
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        this.disconnect(host.id);
        reject(err);
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

  public async executeCommand(hostId: string, command: string): Promise<CommandResult> {
    const host = await this.getHost(hostId);
    if (!host) {
      throw new Error(`Host ${hostId} not found`);
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

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on('error', (err) => {
          reject(err);
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

  private async getHost(hostId: string): Promise<Host | null> {
    // TODO: Implement host lookup from database
    throw new Error('Not implemented');
  }
}

// Export singleton instance
export const sshService = new SSHService();
