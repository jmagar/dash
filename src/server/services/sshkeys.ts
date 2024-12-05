import { EventEmitter } from 'events';
import { AgentManager } from '../managers/agent';
import { KeyDistributionStatus } from '../types/sshkeys';

export class SSHKeyService extends EventEmitter {
    private status: KeyDistributionStatus = {
        status: 'Not started',
        details: '',
        progress: 0,
        agentKeys: new Map()
    };

    constructor(private agentManager: AgentManager) {
        super();
    }

    async getStatus(): Promise<KeyDistributionStatus> {
        return this.status;
    }

    async initiateKeyDistribution(): Promise<void> {
        const agents = await this.agentManager.getConnectedAgents();
        
        this.status = {
            status: 'Starting',
            details: 'Initiating key distribution...',
            progress: 0,
            agentKeys: new Map(agents.map(agent => [agent.id, 'pending']))
        };

        // Send command to all agents to start key distribution
        for (const agent of agents) {
            try {
                await agent.sendCommand('ssh_key_distribute', {
                    hostUrl: process.env.HOST_URL,
                    agents: agents.map(a => a.id).filter(id => id !== agent.id)
                });
            } catch (error) {
                this.status.agentKeys.set(agent.id, `error: ${error.message}`);
            }
        }

        this.emit('status_update', this.status);
    }

    async updateAgentStatus(agentId: string, status: string): Promise<void> {
        this.status.agentKeys.set(agentId, status);
        
        // Calculate overall progress
        const total = this.status.agentKeys.size;
        const completed = Array.from(this.status.agentKeys.values())
            .filter(s => s.includes('complete') || s.includes('error')).length;
        
        this.status.progress = Math.floor((completed / total) * 100);
        
        if (completed === total) {
            this.status.status = 'Complete';
            this.status.details = 'Key distribution finished';
        }

        this.emit('status_update', this.status);
    }
}
