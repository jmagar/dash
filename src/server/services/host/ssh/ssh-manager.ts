import { Client as SSHClient } from 'ssh2';
import type { Host } from '../../../../types/host';
import { LoggingManager } from '../../../managers/LoggingManager';
import { LoggerAdapter } from '../../../utils/logging/logger.adapter';
import type { Logger, LogMetadata } from '../../../../types/logger';

export class SSHManager {
  private readonly logger: Logger;
  private readonly connections = new Map<string, SSHClient>();

  constructor(logManager?: LoggingManager) {
    const baseLogger = logManager ?? LoggingManager.getInstance();
    this.logger = new LoggerAdapter(baseLogger, {
      component: 'SSHManager',
      service: 'HostManagement'
    });
  }

  async cleanup(): Promise<void> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({ 
      operation: 'cleanup',
      component: 'SSHManager'
    });

    try {
      methodLogger.info('Starting cleanup');
      
      await Promise.all(Array.from(this.connections.values()).map(conn => 
        new Promise<void>((resolve) => {
          conn.end();
          resolve();
        })
      ));
      this.connections.clear();

      const duration = Date.now() - startTime;
      methodLogger.info('Cleanup completed', {
        timing: { total: duration }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('Cleanup failed', metadata);
      throw error;
    }
  }

  async withSSH<T>(host: Host, callback: (ssh: SSHClient) => Promise<T>): Promise<T> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({ 
      operation: 'withSSH',
      hostId: host.id,
      component: 'SSHManager'
    });

    let ssh = this.connections.get(host.id);

    if (!ssh) {
      methodLogger.debug('Creating new SSH connection');
      ssh = new SSHClient();
      this.connections.set(host.id, ssh);
    }

    try {
      await new Promise<void>((resolve, reject) => {
        if (!ssh) throw new Error('SSH client not initialized');

        const connection = ssh.connect({
          host: host.hostname,
          port: host.port ?? 22,
          username: host.username,
          privateKey: host.privateKey,
          readyTimeout: 10000,
          keepaliveInterval: 10000
        });

        connection.on('ready', resolve);
        connection.on('error', reject);
      });

      const result = await callback(ssh);

      const duration = Date.now() - startTime;
      methodLogger.debug('SSH operation completed', {
        timing: { total: duration }
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('SSH operation failed', metadata);
      throw error;
    }
  }

  async execCommand(ssh: SSHClient, command: string): Promise<string> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({ 
      operation: 'execCommand',
      command: command.replace(/\n\s+/g, ' ').trim()
    });

    return new Promise((resolve, reject) => {
      ssh.exec(command, (err, stream) => {
        if (err) {
          const metadata: LogMetadata = {
            error: err,
            timing: { total: Date.now() - startTime }
          };
          methodLogger.error('SSH command execution failed', metadata);
          reject(err);
          return;
        }

        let output = '';
        let error = '';

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          error += data.toString();
        });

        stream.on('close', (code: number) => {
          const duration = Date.now() - startTime;
          if (code !== 0) {
            const errorMsg = `Command failed with code ${code}: ${error}`;
            methodLogger.error('Command execution failed', {
              code,
              error,
              timing: { total: duration }
            });
            reject(new Error(errorMsg));
          } else {
            methodLogger.debug('Command executed successfully', {
              code,
              timing: { total: duration }
            });
            resolve(output.trim());
          }
        });
      });
    });
  }
}
