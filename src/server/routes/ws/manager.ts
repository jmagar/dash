import { EventEmitter } from 'events';
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { AgentConnection } from './agent';

export class AgentManager extends EventEmitter {
  private agents: Map<string, AgentConnection> = new Map();
  private wss: WebSocketServer;

  constructor(server: any) {
    super();
    this.wss = new WebSocketServer({ server, path: '/ws/agent' });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      // Extract agent ID from query parameters
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const agentId = url.searchParams.get('agent_id');

      if (!agentId) {
        logger.warn('Connection attempt without agent ID');
        ws.close();
        return;
      }

      // Check if agent is already connected
      if (this.agents.has(agentId)) {
        logger.warn('Agent already connected, terminating old connection', {
          agentId,
        });
        this.agents.get(agentId)!.terminate();
      }

      // Create new agent connection
      const agent = new AgentConnection(ws, agentId);

      // Handle agent events
      agent.on('registered', (info) => {
        this.agents.set(agentId, agent);
        this.emit('agent_registered', info);
      });

      agent.on('disconnected', (id) => {
        this.agents.delete(id);
        this.emit('agent_disconnected', id);
      });

      agent.on('heartbeat', (heartbeat) => {
        this.emit('agent_heartbeat', heartbeat);
      });

      agent.on('command_response', (response) => {
        this.emit('command_response', response);
      });
    });

    // Handle server errors
    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error });
    });

    // Log server start
    logger.info('WebSocket server started on /ws/agent');
  }

  // Get all connected agents
  public getAgents(): Map<string, AgentConnection> {
    return this.agents;
  }

  // Get specific agent
  public getAgent(agentId: string): AgentConnection | undefined {
    return this.agents.get(agentId);
  }

  // Execute command on specific agent
  public async executeCommand(
    agentId: string,
    command: string,
    args: string[] = []
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return agent.executeCommand(command, args);
  }

  // Broadcast message to all agents
  public async broadcast(message: any): Promise<void> {
    const promises = Array.from(this.agents.values()).map((agent) =>
      agent.send(message)
    );
    await Promise.all(promises);
  }

  // Get all agent information
  public getAgentInfos(): Array<z.infer<typeof AgentInfo>> {
    return Array.from(this.agents.values())
      .map((agent) => agent.getAgentInfo())
      .filter((info): info is z.infer<typeof AgentInfo> => info !== undefined);
  }

  // Get agent health status
  public getAgentHealth(agentId: string): z.infer<typeof HeartbeatInfo> | undefined {
    return this.agents.get(agentId)?.getLastHeartbeat();
  }

  // Close all connections
  public async shutdown(): Promise<void> {
    this.agents.forEach((agent) => agent.terminate());
    this.agents.clear();

    return new Promise((resolve) => {
      this.wss.close(() => {
        logger.info('WebSocket server shut down');
        resolve();
      });
    });
  }
}
