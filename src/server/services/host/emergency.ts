import { Client as SSHClient } from 'ssh2';
import { BaseService } from '../base.service';
import type { Host } from '../../../types/host';
import type { EmergencyOperations, OperationResult } from './types';
import { HostState } from './types';
import { LoggingManager } from '../../managers/utils/LoggingManager';

/**
 * EmergencyService provides critical operations when the agent is unavailable
 * This includes:
 * 1. Basic host health checks
 * 2. Process management
 * 3. Service restarts
 * 4. Network diagnostics
 */
export class EmergencyService extends BaseService implements EmergencyOperations {
  /**
   * Implements cleanup method from BaseService
   */
  async cleanup(): Promise<void> {
    // Close any open connections
    await Promise.all(Array.from(this.connections.values()).map(conn => conn.end()));
    this.connections.clear();
  }

  /**
   * Restart the agent service
   */
  async restart(hostId: string): Promise<OperationResult> {
    const host = await this.db.hosts.findById(hostId);
    if (!host) {
      return {
        success: false,
        error: new Error('Host not found'),
        state: HostState.ERROR
      };
    }

    try {
      await this.withSSH(host, async (ssh) => {
        // Try systemctl first
        try {
          await this.execCommand(ssh, 'sudo systemctl restart shh-agent');
          return;
        } catch (error) {
          this.loggerLoggingManager.getInstance().();
        }

        // Fallback to process kill
        try {
          await this.execCommand(ssh, 'pkill -f shh-agent');
          await new Promise(resolve => setTimeout(resolve, 1000));
          await this.execCommand(ssh, '/opt/shh/agent/agent &');
        } catch (error) {
          throw new Error('Failed to restart agent via process kill');
        }
      });

      return {
        success: true,
        state: HostState.MAINTENANCE
      };
    } catch (error) {
      this.loggerLoggingManager.getInstance().();
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        state: HostState.ERROR
      };
    }
  }

  /**
   * Kill a specific process
   */
  async killProcess(hostId: string, pid: number): Promise<OperationResult> {
    const host = await this.db.hosts.findById(hostId);
    if (!host) {
      return {
        success: false,
        error: new Error('Host not found'),
        state: HostState.ERROR
      };
    }

    try {
      await this.withSSH(host, async (ssh) => {
        await this.execCommand(ssh, `kill -9 ${pid}`);
      });

      return {
        success: true,
        state: HostState.ACTIVE
      };
    } catch (error) {
      this.loggerLoggingManager.getInstance().();
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        state: HostState.ERROR
      };
    }
  }

  /**
   * Check if host is reachable via SSH
   */
  async checkConnectivity(hostId: string): Promise<OperationResult<boolean>> {
    const host = await this.db.hosts.findById(hostId);
    if (!host) {
      return {
        success: false,
        error: new Error('Host not found'),
        state: HostState.ERROR
      };
    }

    try {
      let connected = false;
      await this.withSSH(host, async (ssh) => {
        try {
          await this.execCommand(ssh, 'echo 1');
          connected = true;
        } catch {
          connected = false;
        }
      });

      return {
        success: true,
        data: connected,
        state: HostState.ACTIVE
      };
    } catch (error) {
      this.loggerLoggingManager.getInstance().();
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        state: HostState.UNREACHABLE
      };
    }
  }

  /**
   * Execute command with timeout and error handling
   */
  private async execCommand(ssh: SSHClient, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ssh.exec(command, (err, stream) => {
        if (err) {
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
          if (code !== 0) {
            reject(new Error(`Command failed with code ${code}: ${error}`));
          } else {
            resolve(output.trim());
          }
        });
      });
    });
  }

  /**
   * Check available disk space
   */
  private async checkDiskSpace(ssh: SSHClient): Promise<void> {
    const output = await this.execCommand(ssh, 'df -h /');
    const lines = output.split('\n');
    if (lines.length < 2) throw new Error('Invalid df output');

    const [, usage] = lines[1].split(/\s+/);
    const usagePercent = parseInt(usage.replace('%', ''));

    if (usagePercent > 90) {
      throw new Error(`Disk usage critical: ${usagePercent}%`);
    }
  }

  /**
   * Check available memory
   */
  private async checkMemory(ssh: SSHClient): Promise<void> {
    const output = await this.execCommand(ssh, 'free -m');
    const lines = output.split('\n');
    if (lines.length < 2) throw new Error('Invalid free output');

    const [, total, used] = lines[1].split(/\s+/).map(Number);
    const usagePercent = (used / total) * 100;

    if (usagePercent > 90) {
      throw new Error(`Memory usage critical: ${usagePercent.toFixed(1)}%`);
    }
  }

  /**
   * Check network connectivity
   */
  private async checkNetwork(ssh: SSHClient): Promise<void> {
    // Check DNS resolution
    await this.execCommand(ssh, 'ping -c 1 google.com');

    // Check HTTP connectivity
    await this.execCommand(ssh, 'curl -s -S --max-time 5 https://google.com > /dev/null');
  }
}


