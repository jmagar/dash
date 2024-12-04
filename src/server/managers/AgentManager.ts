import { EventEmitter } from 'events';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import http from 'http';
import { BaseService } from '../services/base.service';
import { LoggingManager } from './LoggingManager';
import { MetricsManager } from './MetricsManager';
import { SecurityManager } from './SecurityManager';
import { ConfigManager } from './ConfigManager';

// Agent Connection Schema
const AgentConnectionSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  version: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

// Heartbeat Schema
const HeartbeatSchema = z.object({
  timestamp: z.number(),
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  cpu: z.number().optional(),
  memory: z.number().optional(),
  disk: z.number().optional()
});

// Message Schema
const MessageSchema = z.object({
  type: z.string(),
  payload: z.record(z.string(), z.unknown())
});

export class AgentConnection extends EventEmitter {
  private id: string;
  private ws: WebSocket;
  private lastHeartbeat?: z.infer<typeof HeartbeatSchema>;
  private metadata: Record<string, unknown>;

  constructor(
    ws: WebSocket, 
    id: string, 
    private loggingManager: LoggingManager,
    private metricsManager: MetricsManager
  ) {
    super();
    this.id = id;
    this.ws = ws;
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.ws.on('message', (data: string) => {
      try {
        const message = MessageSchema.parse(JSON.parse(data));
        this.handleMessage(message);
      } catch (error) {
        this.loggingManager.error('Invalid agent message', { 
          agentId: this.id, 
          error 
        });
      }
    });

    this.ws.on('close', () => {
      this.loggingManager.info('Agent disconnected', { agentId: this.id });
      this.emit('disconnected', this.id);
    });

    this.ws.on('error', (error) => {
      this.loggingManager.error('Agent connection error', { 
        agentId: this.id, 
        error 
      });
    });
  }

  private handleMessage(message: z.infer<typeof MessageSchema>): void {
    switch (message.type) {
      case 'heartbeat':
        this.handleHeartbeat(message.payload);
        break;
      case 'command_response':
        this.emit('command_response', message.payload);
        break;
      case 'registration':
        this.handleRegistration(message.payload);
        break;
      default:
        this.loggingManager.warn('Unhandled agent message type', { 
          agentId: this.id, 
          type: message.type 
        });
    }
  }

  private handleHeartbeat(payload: Record<string, unknown>): void {
    try {
      const heartbeat = HeartbeatSchema.parse(payload);
      this.lastHeartbeat = heartbeat;
      this.emit('heartbeat', heartbeat);

      // Update metrics
      this.metricsManager.setGauge('agent_cpu_usage', heartbeat.cpu || 0, { agentId: this.id });
      this.metricsManager.setGauge('agent_memory_usage', heartbeat.memory || 0, { agentId: this.id });
    } catch (error) {
      this.loggingManager.error('Invalid heartbeat', { 
        agentId: this.id, 
        error 
      });
    }
  }

  private handleRegistration(payload: Record<string, unknown>): void {
    try {
      const agentInfo = AgentConnectionSchema.parse({
        ...payload,
        id: this.id
      });
      this.metadata = agentInfo.metadata || {};
      this.emit('registered', agentInfo);
    } catch (error) {
      this.loggingManager.error('Invalid agent registration', { 
        agentId: this.id, 
        error 
      });
    }
  }

  public async send(message: z.infer<typeof MessageSchema>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.send(JSON.stringify(message), (err) => {
        if (err) {
          this.loggingManager.error('Failed to send message', { 
            agentId: this.id, 
            error: err 
          });
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public async executeCommand(command: string, args: string[] = []): Promise<void> {
    await this.send({
      type: 'command',
      payload: { command, args }
    });
  }

  public getAgentInfo(): z.infer<typeof AgentConnectionSchema> | undefined {
    return this.metadata ? { 
      id: this.id, 
      ...this.metadata 
    } : undefined;
  }

  public getLastHeartbeat(): z.infer<typeof HeartbeatSchema> | undefined {
    return this.lastHeartbeat;
  }

  public terminate(): void {
    try {
      this.ws.close();
    } catch (error) {
      this.loggingManager.error('Error terminating agent connection', { 
        agentId: this.id, 
        error 
      });
    }
  }
}

export class AgentManager extends BaseService {
  private static instance: AgentManager;
  private agents: Map<string, AgentConnection> = new Map();
  private wss: WebSocketServer;

  private constructor(
    private loggingManager: LoggingManager,
    private metricsManager: MetricsManager,
    private securityManager: SecurityManager,
    private configManager: ConfigManager,
    server: http.Server
  ) {
    super({
      name: 'AgentManager',
      version: '1.0.0',
      dependencies: [
        'LoggingManager', 
        'MetricsManager', 
        'SecurityManager', 
        'ConfigManager'
      ]
    });

    this.wss = new WebSocketServer({ 
      server, 
      path: this.configManager.get('agents.websocket.path', '/ws/agent') 
    });
    this.setupWebSocketServer();
    this.initializeMetrics();
  }

  public static getInstance(
    loggingManager: LoggingManager,
    metricsManager: MetricsManager,
    securityManager: SecurityManager,
    configManager: ConfigManager,
    server: http.Server
  ): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager(
        loggingManager,
        metricsManager,
        securityManager,
        configManager,
        server
      );
    }
    return AgentManager.instance;
  }

  private initializeMetrics(): void {
    this.metricsManager.createGauge('connected_agents_total', 'Total number of connected agents');
    this.metricsManager.createCounter('agent_registrations_total', 'Total agent registrations');
    this.metricsManager.createCounter('agent_disconnections_total', 'Total agent disconnections');
    this.metricsManager.createGauge('agent_cpu_usage', 'Agent CPU usage', ['agentId']);
    this.metricsManager.createGauge('agent_memory_usage', 'Agent memory usage', ['agentId']);
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws, req) => {
      try {
        if (!req.url || !req.headers.host) {
          this.loggingManager.warn('Invalid WebSocket connection attempt');
          ws.close();
          return;
        }

        const url = new URL(req.url, `http://${req.headers.host}`);
        const agentId = url.searchParams.get('agent_id');

        if (!agentId) {
          this.loggingManager.warn('Agent connection without ID');
          ws.close();
          return;
        }

        // Security checks
        const clientIp = req.socket.remoteAddress || 'unknown';
        if (!this.securityManager.isAllowedConnection(clientIp)) {
          this.loggingManager.warn('Blocked agent connection', { ip: clientIp });
          ws.close();
          return;
        }

        // Handle existing connections
        const existingAgent = this.agents.get(agentId);
        if (existingAgent) {
          this.loggingManager.info('Replacing existing agent connection', { agentId });
          existingAgent.terminate();
        }

        // Create new agent connection
        const agent = new AgentConnection(
          ws, 
          agentId, 
          this.loggingManager,
          this.metricsManager
        );

        agent.on('registered', (info) => {
          this.agents.set(agentId, agent);
          this.metricsManager.incrementCounter('agent_registrations_total');
          this.metricsManager.setGauge('connected_agents_total', this.agents.size);
          this.loggingManager.info('Agent registered', { agentId, info });
        });

        agent.on('disconnected', (id) => {
          this.agents.delete(id);
          this.metricsManager.incrementCounter('agent_disconnections_total');
          this.metricsManager.setGauge('connected_agents_total', this.agents.size);
          this.loggingManager.info('Agent disconnected', { agentId: id });
        });
      } catch (error) {
        this.loggingManager.error('WebSocket connection error', { error });
        ws.close();
      }
    });

    this.wss.on('error', (error) => {
      this.loggingManager.error('WebSocket server error', { error });
    });
  }

  async init(): Promise<void> {
    try {
      const config = this.configManager.get('agents', {
        maxConnections: 100,
        heartbeatInterval: 30000
      });

      this.loggingManager.info('AgentManager initialized', { config });
    } catch (error) {
      this.loggingManager.error('Failed to initialize AgentManager', { error });
      throw error;
    }
  }

  async getHealth(): Promise<{ 
    status: 'healthy' | 'unhealthy' | 'degraded'; 
    details?: Record<string, unknown>; 
  }> {
    try {
      const agentHealthStatuses = Array.from(this.agents.values())
        .map(agent => agent.getLastHeartbeat()?.status)
        .filter(status => status !== undefined);

      const status = agentHealthStatuses.some(s => s === 'unhealthy') 
        ? 'unhealthy' 
        : agentHealthStatuses.some(s => s === 'degraded') 
          ? 'degraded' 
          : 'healthy';

      return {
        status,
        details: {
          totalAgents: this.agents.size,
          agentStatuses: agentHealthStatuses
        }
      };
    } catch (error) {
      this.loggingManager.error('AgentManager health check failed', { error });
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.shutdown();
      this.loggingManager.info('AgentManager cleaned up successfully');
    } catch (error) {
      this.loggingManager.error('Error during AgentManager cleanup', { error });
      throw error;
    }
  }

  public getAgents(): Map<string, AgentConnection> {
    return this.agents;
  }

  public getAgent(agentId: string): AgentConnection | undefined {
    return this.agents.get(agentId);
  }

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

  public async broadcast(message: z.infer<typeof MessageSchema>): Promise<void> {
    const promises = Array.from(this.agents.values()).map((agent) =>
      agent.send(message)
    );
    await Promise.all(promises);
  }

  public getAgentInfos(): Array<z.infer<typeof AgentConnectionSchema>> {
    return Array.from(this.agents.values())
      .map((agent) => agent.getAgentInfo())
      .filter((info): info is z.infer<typeof AgentConnectionSchema> => info !== undefined);
  }

  public async shutdown(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Terminate all agent connections
        this.agents.forEach((agent) => agent.terminate());
        this.agents.clear();

        // Close WebSocket server
        this.wss.close((err) => {
          if (err) {
            this.loggingManager.error('Error closing WebSocket server', { error: err });
            reject(err);
          } else {
            this.loggingManager.info('WebSocket server shut down');
            resolve();
          }
        });
      } catch (error) {
        this.loggingManager.error('Error during shutdown', { error });
        reject(error);
      }
    });
  }
}

export default AgentManager;
