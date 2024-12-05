import { FileSystemCredentials, type FileSystemType } from './types';
import { SFTPProvider } from './sftp.provider';
import type { Host } from '../../../types/host';
import { AgentService } from '../agent/agent.service';
import type { LogMetadata } from '../../../types/logger';
import { LoggingManager } from '../../managers/LoggingManager';
import type { AgentInfo } from '../agent/agent.types';

interface SSHCredentials {
  username: string;
  privateKey: string;
}

export class AgentSFTPProvider extends SFTPProvider {
  private readonly logger: LoggingManager;

  constructor(
    private readonly agentService: AgentService,
    private readonly host: Host
  ) {
    super();
    this.logger = LoggingManager.getInstance();
  }

  async connect(): Promise<void> {
    try {
      // Get the agent's status first
      const agentResult = await this.agentService.getAgent(this.host.id);
      if (!agentResult.success || !agentResult.data) {
        const metadata: LogMetadata = {
          error: 'Agent not available',
          component: 'AgentSFTPProvider',
          operation: 'connect',
          hostId: this.host.id
        };
        this.logger.error('Failed to get agent information', metadata);
        throw new Error('Agent not available');
      }

      // Get SSH credentials from agent info
      const sshCredentials = this.extractSSHCredentials(agentResult.data);
      if (!sshCredentials) {
        const metadata: LogMetadata = {
          error: 'Invalid agent SSH credentials',
          component: 'AgentSFTPProvider',
          operation: 'connect',
          hostId: this.host.id
        };
        this.logger.error('Invalid agent SSH credentials', metadata);
        throw new Error('Invalid agent SSH credentials');
      }

      // Use the agent's existing SSH credentials
      const agentCredentials: FileSystemCredentials & { type: FileSystemType } = {
        type: 'sftp',
        host: this.host.hostname,
        port: this.host.port || 22,
        username: sshCredentials.username,
        privateKey: sshCredentials.privateKey
      };

      // Connect using the agent's credentials
      return super.connect(agentCredentials);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        component: 'AgentSFTPProvider',
        operation: 'connect',
        hostId: this.host.id
      };
      this.logger.error('Failed to connect to SFTP', metadata);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private extractSSHCredentials(agentInfo: AgentInfo): SSHCredentials | null {
    // Since AgentInfo is a strict interface, we need to check if the required
    // SSH properties exist as custom fields or in a specific location
    const info = agentInfo as unknown as { credentials?: { ssh?: SSHCredentials } };
    
    if (
      info.credentials?.ssh?.username &&
      info.credentials?.ssh?.privateKey
    ) {
      return {
        username: info.credentials.ssh.username,
        privateKey: info.credentials.ssh.privateKey
      };
    }
    return null;
  }

  // Override test to verify both agent and SFTP connection
  async test(): Promise<boolean> {
    try {
      // First check if agent is connected
      const agentStatus = await this.agentService.getAgentStatus(this.host.id);
      if (agentStatus !== 'connected') {
        const metadata: LogMetadata = {
          error: 'Agent not connected',
          component: 'AgentSFTPProvider',
          operation: 'test',
          hostId: this.host.id,
          agentStatus
        };
        this.logger.warn('Agent connection test failed', metadata);
        return false;
      }

      // Then test SFTP connection
      return await super.test();
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        component: 'AgentSFTPProvider',
        operation: 'test',
        hostId: this.host.id
      };
      this.logger.error('SFTP connection test failed', metadata);
      return false;
    }
  }
}
