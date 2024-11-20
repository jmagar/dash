import { Client as SSHClient } from 'ssh2';
import { FileSystemProvider, FileSystemCredentials } from './types';
import { SFTPProvider } from './sftp.provider';
import { Host } from '../../../types/host';
import { AgentService } from '../agent/agent.service';

export class AgentSFTPProvider extends SFTPProvider {
  constructor(
    private readonly agentService: AgentService,
    private readonly host: Host
  ) {
    super();
  }

  async connect(credentials?: FileSystemCredentials): Promise<void> {
    // Get the agent's SSH connection details
    const agentConnection = await this.agentService.getAgentConnection(this.host.id);
    if (!agentConnection) {
      throw new Error('Agent connection not available');
    }

    // Use the agent's existing SSH credentials
    const agentCredentials: FileSystemCredentials = {
      type: 'sftp',
      host: this.host.hostname,
      port: this.host.port || 22,
      username: agentConnection.username,
      privateKey: agentConnection.privateKey,
    };

    // Connect using the agent's credentials
    return super.connect(agentCredentials);
  }

  // Override test to verify both agent and SFTP connection
  async test(): Promise<boolean> {
    try {
      // First check if agent is connected
      const agentStatus = await this.agentService.getAgentStatus(this.host.id);
      if (!agentStatus.connected) {
        return false;
      }

      // Then test SFTP connection
      return await super.test();
    } catch {
      return false;
    }
  }
}
