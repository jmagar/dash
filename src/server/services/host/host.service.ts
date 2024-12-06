import { BaseService } from '../base.service';
import { Client as SSHClient } from 'ssh2';
import { AgentService } from '../agent/agent.service';
import { LinuxInstaller } from './installers/linux';
import { WindowsInstaller } from './installers/windows';
import { DarwinInstaller } from './installers/darwin';
import type { Host } from '../../../types/host';
import type { AgentInfo, AgentOperationResult } from '../agent/agent.types';
import {
  HostState,
  HostServiceConfig,
  InstallOptions,
  OperationResult,
  CreateHostRequest,
  SystemInfo,
  AgentInstaller,
  Database,
  ExtendedHost,
  HostOS,
  mapStateToStatus,
  mapStatusToState
} from './host.types';
import { EmergencyService } from './emergency/emergency.service';
import type { EmergencyOperations } from './emergency/types';

type InstallerMap = { [K in HostOS]: AgentInstaller };

interface SSHOptions {
  timeout?: number;
}

/**
 * Create a timeout promise
 */
function createTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    })
  ]);
}

export class HostService extends BaseService {
  private readonly hostConfig: HostServiceConfig;
  private readonly agentService: AgentService;
  private readonly installers: InstallerMap;
  private readonly hostDb: Database;
  private readonly currentUserId: string;

  constructor(hostConfig: HostServiceConfig, agentService: AgentService, hostDb: Database, userId: string) {
    super({
      retryOptions: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        factor: 2
      },
      sshOptions: {
        timeout: hostConfig.ssh.timeout,
        keepaliveInterval: hostConfig.ssh.keepaliveInterval
      },
      metricsEnabled: true,
      loggingEnabled: true,
      validation: { strict: true }
    });
    this.hostConfig = hostConfig;
    this.agentService = agentService;
    this.hostDb = hostDb;
    this.currentUserId = userId;
    this.installers = {
      linux: new LinuxInstaller(),
      windows: new WindowsInstaller(),
      darwin: new DarwinInstaller()
    };
  }

  /**
   * Convert Host to ExtendedHost
   */
  private toExtendedHost(host: Host, os: HostOS): ExtendedHost {
    return {
      ...host,
      os,
      state: mapStatusToState(host.status)
    };
  }

  /**
   * Get a host by ID
   */
  async getHost(hostId: string): Promise<ExtendedHost | null> {
    const result = await this.hostDb.query<Host & { os: HostOS }>(
      'SELECT h.*, hi.os FROM hosts h LEFT JOIN host_info hi ON h.id = hi.host_id WHERE h.id = $1 AND h.user_id = $2',
      [hostId, this.currentUserId]
    );

    const host = result.rows[0];
    return host ? this.toExtendedHost(host, host.os) : null;
  }

  /**
   * Create a new host
   */
  async createHost(data: CreateHostRequest): Promise<OperationResult<ExtendedHost>> {
    try {
      // Create host record
      const result = await this.hostDb.query<Host>(
        `INSERT INTO hosts (
          user_id, name, hostname, port, username, password,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *`,
        [
          this.currentUserId,
          data.name,
          data.hostname,
          data.port,
          data.username,
          data.password,
          mapStateToStatus(HostState.UNINITIALIZED)
        ]
      );

      if (!result.rows[0]) {
        throw new Error('Failed to create host record');
      }

      // Store OS information
      await this.hostDb.query(
        'INSERT INTO host_info (host_id, os) VALUES ($1, $2)',
        [result.rows[0].id, data.os]
      );

      const host = this.toExtendedHost(result.rows[0], data.os);

      // Verify SSH connection
      await this.verifyConnection(host);

      this.emit('host:created', host);
      return {
        success: true,
        data: host,
        state: HostState.UNINITIALIZED
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create host'),
        state: HostState.ERROR
      };
    }
  }

  /**
   * Install agent on host
   */
  async installAgent(hostId: string, options?: InstallOptions): Promise<OperationResult> {
    try {
      const host = await this.getHost(hostId);
      if (!host) {
        throw new Error('Host not found');
      }

      // Update host state
      await this.updateHostState(hostId, HostState.INSTALLING);
      this.emit('agent:installing', hostId);

      // Connect via SSH and install
      await this.executeWithSSH(host, async (client: SSHClient) => {
        // Get system info
        const systemInfo = await this.getSystemInfo(client);

        // Get installer for OS
        const installer = this.installers[systemInfo.os];
        if (!installer) {
          throw new Error(`No installer available for OS: ${systemInfo.os}`);
        }

        // Install agent
        await installer.install(host, client, {
          version: options?.version || 'latest',
          config: {
            serverUrl: this.hostConfig.agent.serverUrl,
            features: options?.config?.features || this.hostConfig.agent.defaultFeatures,
            labels: options?.config?.labels,
          }
        });
      }, { timeout: options?.timeout });

      // Wait for agent to connect
      const agentResult = await this.waitForAgent(hostId, options?.timeout || this.hostConfig.agent.connectTimeout);
      if (!agentResult.success || !agentResult.data) {
        throw new Error('Agent failed to connect after installation');
      }

      // Update host state
      await this.updateHostState(hostId, HostState.ACTIVE);
      this.emit('agent:installed', hostId, agentResult.data);

      return {
        success: true,
        state: HostState.ACTIVE
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Installation failed');
      await this.updateHostState(hostId, HostState.ERROR);
      this.emit('agent:error', hostId, errorObj);

      return {
        success: false,
        error: errorObj,
        state: HostState.ERROR
      };
    }
  }

  /**
   * Get system information via SSH
   */
  private async getSystemInfo(ssh: SSHClient): Promise<SystemInfo> {
    const [platform, release, arch] = await Promise.all([
      this.executeCommand(ssh, 'uname -s'),
      this.executeCommand(ssh, 'uname -r'),
      this.executeCommand(ssh, 'uname -m')
    ]);

    let os: HostOS;
    switch (platform.toLowerCase()) {
      case 'linux':
        os = 'linux';
        break;
      case 'darwin':
        os = 'darwin';
        break;
      case 'windows_nt':
        os = 'windows';
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    const hostname = await this.executeCommand(ssh, 'hostname');

    return {
      os,
      arch,
      version: release,
      hostname,
      platform
    };
  }

  /**
   * Get emergency operations when agent is down
   */
  getEmergencyOperations(hostId: string): EmergencyOperations {
    const emergencyService = new EmergencyService(this);
    return {
      restart: () => emergencyService.restart(hostId),
      killProcess: (hostId: string, pid: number) => emergencyService.killProcess(hostId, pid),
      checkConnectivity: () => emergencyService.checkConnectivity(hostId),
      cleanup: () => emergencyService.cleanup()
    };
  }

  /**
   * Verify SSH connection
   */
  private async verifyConnection(host: ExtendedHost): Promise<void> {
    await this.executeWithSSH(
      host,
      async (ssh: SSHClient) => {
        await this.executeCommand(ssh, 'echo "Connection test"');
      },
      { timeout: this.hostConfig.ssh.timeout }
    );
  }

  /**
   * Execute command via SSH
   */
  private async executeCommand(ssh: SSHClient, command: string): Promise<string> {
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
   * Execute function with SSH connection
   */
  private async executeWithSSH<T>(
    host: ExtendedHost,
    fn: (client: SSHClient) => Promise<T>,
    options?: SSHOptions
  ): Promise<T> {
    return this.sshService.withSSH(host.hostname, fn);
  }

  /**
   * Update host state
   */
  private async updateHostState(hostId: string, state: HostState): Promise<void> {
    await this.hostDb.query(
      'UPDATE hosts SET status = $1, updated_at = NOW() WHERE id = $2',
      [mapStateToStatus(state), hostId]
    );
  }

  /**
   * Wait for agent to connect with polling
   */
  private async waitForAgent(hostId: string, timeout: number): Promise<AgentOperationResult<AgentInfo>> {
    const pollInterval = 1000; // 1 second
    const pollPromise = new Promise<AgentOperationResult<AgentInfo>>((resolve) => {
      const poll = async () => {
        try {
          const agent = await this.agentService.getAgent(hostId);
          if (agent.success && agent.data) {
            resolve(agent);
          } else {
            setTimeout(() => void poll(), pollInterval);
          }
        } catch {
          setTimeout(() => void poll(), pollInterval);
        }
      };
      void poll();
    });

    return createTimeout(pollPromise, timeout);
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    // Nothing to clean up
  }
}
