import { BaseService } from '../base.service';
import { Client as SSHClient } from 'ssh2';
import { AgentService } from '../agent/agent.service';
import { LinuxInstaller } from './installers/linux';
import { WindowsInstaller } from './installers/windows';
import { DarwinInstaller } from './installers/darwin';
import type { Host } from '../../../types/host';
import type { AgentState } from '../agent/agent.types';
import {
  HostState,
  HostServiceConfig,
  InstallOptions,
  OperationResult,
  EmergencyOperations,
  CreateHostRequest,
  UpdateHostRequest,
  SystemInfo,
  AgentInstaller,
  Database,
  ExtendedHost,
  HostOS,
  mapStateToStatus,
  mapStatusToState
} from './host.types';

type InstallerMap = { [K in HostOS]: AgentInstaller };

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
  private readonly config: HostServiceConfig;
  private readonly agentService: AgentService;
  private readonly installers: InstallerMap;
  private readonly db: Database;
  private readonly currentUserId: string;

  constructor(config: HostServiceConfig, agentService: AgentService, db: Database, userId: string) {
    super();
    this.config = config;
    this.agentService = agentService;
    this.db = db;
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
    const result = await this.db.query<Host & { os: HostOS }>(
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
      const result = await this.db.query<Host>(
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

      // Store OS information
      await this.db.query(
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

      // Connect via SSH
      await this.withSSH(
        host,
        async (client) => {
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
              serverUrl: this.config.agent.serverUrl,
              features: options?.config?.features || this.config.agent.defaultFeatures,
              labels: options?.config?.labels,
            }
          });
        },
        { timeout: options?.timeout }
      );

      // Wait for agent to connect
      const agent = await this.waitForAgent(hostId, options?.timeout || this.config.agent.connectTimeout);

      // Update host state
      await this.updateHostState(hostId, HostState.ACTIVE);
      this.emit('agent:installed', hostId, agent);

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
    return {
      restart: async () => {
        const host = await this.getHost(hostId);
        if (!host) throw new Error('Host not found');

        await this.withSSH(
          host,
          async (ssh) => {
            if (host.os === 'windows') {
              await this.executeCommand(ssh, 'shutdown /r /t 0');
            } else {
              await this.executeCommand(ssh, 'sudo shutdown -r now');
            }
          },
          { timeout: this.config.ssh.timeout }
        );
      },

      killProcess: async (pid: number) => {
        const host = await this.getHost(hostId);
        if (!host) throw new Error('Host not found');

        await this.withSSH(
          host,
          async (ssh) => {
            await this.executeCommand(ssh, `kill -9 ${pid}`);
          },
          { timeout: this.config.ssh.timeout }
        );
      },

      checkConnectivity: async () => {
        try {
          const host = await this.getHost(hostId);
          if (!host) return false;

          await this.verifyConnection(host);
          return true;
        } catch {
          return false;
        }
      }
    };
  }

  /**
   * Verify SSH connection
   */
  private async verifyConnection(host: ExtendedHost): Promise<void> {
    await this.withSSH(
      host,
      async (ssh) => {
        await this.executeCommand(ssh, 'echo "Connection test"');
      },
      { timeout: this.config.ssh.timeout }
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
   * Update host state
   */
  private async updateHostState(hostId: string, state: HostState): Promise<void> {
    await this.db.query(
      'UPDATE hosts SET status = $1, updated_at = NOW() WHERE id = $2',
      [mapStateToStatus(state), hostId]
    );
  }

  /**
   * Wait for agent to connect with polling
   */
  private async waitForAgent(hostId: string, timeout: number): Promise<AgentState> {
    const pollInterval = 1000; // 1 second
    const pollPromise = new Promise<AgentState>((resolve, reject) => {
      const poll = async () => {
        try {
          const agent = await this.agentService.getAgent(hostId);
          if (agent) {
            resolve(agent);
          } else {
            setTimeout(() => void poll(), pollInterval);
          }
        } catch (error) {
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