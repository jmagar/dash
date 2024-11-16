import { Client, ClientChannel } from 'ssh2';
import type { SSHConfig } from '../../types/models-shared';
import { logger } from '../utils/logger';

interface SSHExecResult {
  code: number;
  signal: string | null;
  stdout: string;
  stderr: string;
}

class SSHService {
  private clients: Map<string, Client> = new Map();

  async connect(hostId: string, config: SSHConfig): Promise<Client> {
    return new Promise((resolve, reject) => {
      const client = new Client();

      client.on('ready', () => {
        this.clients.set(hostId, client);
        resolve(client);
      });

      client.on('error', (err) => {
        logger.error(`SSH connection error for host ${hostId}:`, {
          hostId,
          error: err.message,
        });
        reject(err);
      });

      client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
      });
    });
  }

  async disconnect(hostId: string): Promise<void> {
    const client = this.clients.get(hostId);
    if (client) {
      client.end();
      this.clients.delete(hostId);
    }
  }

  async executeCommand(hostId: string, command: string): Promise<SSHExecResult> {
    const client = this.clients.get(hostId);
    if (!client) {
      throw new Error(`No SSH connection found for host ${hostId}`);
    }

    return new Promise((resolve, reject) => {
      client.exec(command, (err: Error | undefined, stream: ClientChannel) => {
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

        stream.on('close', (code: number, signal: string | null) => {
          resolve({
            code,
            signal,
            stdout,
            stderr,
          });
        });

        stream.on('error', (err) => {
          reject(err);
        });
      });
    });
  }
}

export const sshService = new SSHService();
