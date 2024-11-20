import { WebSocket } from 'ws';
import { Socket } from 'socket.io';
import { BaseService } from '../base.service';
import { ProtocolHandler } from './agent.protocol';
import { AgentState } from './agent.types';
import type { AgentInfo, AgentMetrics, AgentCommandResult } from '../../../types/socket-events';
import type { LogMetadata } from '../../../types/logger';

const AGENT_CACHE_TTL = 3600; // 1 hour
const AGENT_METRICS_TTL = 300; // 5 minutes

export class AgentService extends BaseService {
  private readonly agents = new Map<string, AgentState>();
  private readonly protocolHandler: ProtocolHandler;

  constructor() {
    super();
    this.protocolHandler = new ProtocolHandler(
      this.handleRegister.bind(this),
      this.handleHeartbeat.bind(this),
      this.handleDisconnect.bind(this),
      this.handleCommandResponse.bind(this)
    );

    // Start periodic cleanup of stale agents
    setInterval(() => this.cleanupStaleAgents(), 60000);
  }

  // Protocol entry points
  handleWebSocket(ws: WebSocket): void {
    try {
      this.protocolHandler.handleWebSocket(ws);
    } catch (error) {
      this.handleError(error, { protocol: 'websocket' });
    }
  }

  handleSocketIO(socket: Socket): void {
    try {
      this.protocolHandler.handleSocketIO(socket);
    } catch (error) {
      this.handleError(error, { protocol: 'socketio' });
    }
  }

  // Core agent management
  private async handleRegister(connection: WebSocket | Socket, info: AgentInfo, type: 'ws' | 'socketio'): Promise<void> {
    const metadata: LogMetadata = {
      hostId: info.hostId,
      type,
      hostname: info.hostname,
      platform: info.platform,
    };

    try {
      const agent: AgentState = {
        id: info.hostId,
        info,
        connection,
        connectionType: type,
        lastSeen: new Date(),
        status: 'connected'
      };

      await this.withCache(`agent:${info.hostId}`, async () => {
        this.agents.set(info.hostId, agent);
        return agent;
      }, AGENT_CACHE_TTL);

      this.recordMetric('agent_registered', 1, {
        hostId: info.hostId,
        type,
        platform: info.platform,
      });

      this.logger.info('Agent registered', metadata);
    } catch (error) {
      this.handleError(error, metadata);
    }
  }

  private async handleHeartbeat(metrics: AgentMetrics): Promise<void> {
    const metadata: LogMetadata = {
      hostId: metrics.hostId,
      metrics: JSON.stringify(metrics),
    };

    try {
      const agent = await this.withCache(`agent:${metrics.hostId}`, async () => {
        return this.agents.get(metrics.hostId);
      });

      if (!agent) {
        throw new Error(`No agent found for host ${metrics.hostId}`);
      }

      agent.lastSeen = new Date();
      agent.metrics = metrics;

      // Cache metrics separately with shorter TTL
      await this.withCache(
        `metrics:${metrics.hostId}`,
        async () => metrics,
        AGENT_METRICS_TTL
      );

      this.recordMetric('agent_heartbeat', 1, {
        hostId: metrics.hostId,
        status: agent.status,
      });
    } catch (error) {
      this.handleError(error, metadata);
    }
  }

  private handleDisconnect(connection: WebSocket | Socket): void {
    for (const [id, agent] of this.agents.entries()) {
      if (agent.connection === connection) {
        const metadata: LogMetadata = {
          hostId: id,
          type: agent.connectionType,
          lastSeen: agent.lastSeen.toISOString(),
        };

        try {
          this.agents.delete(id);
          this.cache.del(`agent:${id}`);
          this.recordMetric('agent_disconnected', 1, { hostId: id });
          this.logger.info('Agent disconnected', metadata);
        } catch (error) {
          this.handleError(error, metadata);
        }
        break;
      }
    }
  }

  private handleCommandResponse(result: AgentCommandResult): void {
    const metadata: LogMetadata = {
      hostId: result.hostId,
      command: result.command,
      status: result.status,
    };

    try {
      this.recordMetric('agent_command_response', 1, {
        hostId: result.hostId,
        status: result.status,
      });

      this.logger.debug('Command response received', metadata);
    } catch (error) {
      this.handleError(error, metadata);
    }
  }

  // Public API
  async executeCommand(hostId: string, command: string): Promise<void> {
    const metadata: LogMetadata = { hostId, command };

    try {
      const agent = await this.withCache(`agent:${hostId}`, async () => {
        return this.agents.get(hostId);
      });

      if (!agent) {
        throw new Error(`No agent found for host ${hostId}`);
      }

      await this.withRetry(
        () => {
          this.protocolHandler.sendCommand(agent, command);
          return Promise.resolve();
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          factor: 2,
          timeout: 5000,
        }
      );

      this.recordMetric('agent_command_sent', 1, { hostId });
    } catch (error) {
      this.handleError(error, metadata);
    }
  }

  async getAgent(hostId: string): Promise<AgentState | undefined> {
    return this.withCache(`agent:${hostId}`, async () => {
      return this.agents.get(hostId);
    });
  }

  async getAllAgents(): Promise<AgentState[]> {
    return this.withCache('agents:all', async () => {
      return Array.from(this.agents.values());
    });
  }

  private async cleanupStaleAgents(): Promise<void> {
    const staleThreshold = new Date(Date.now() - 300000); // 5 minutes
    let staleCount = 0;

    for (const [id, agent] of this.agents.entries()) {
      if (agent.lastSeen < staleThreshold) {
        if (agent.connectionType === 'ws') {
          (agent.connection as WebSocket).terminate();
        } else {
          (agent.connection as Socket).disconnect(true);
        }
        this.agents.delete(id);
        this.cache.del(`agent:${id}`);
        staleCount++;
      }
    }

    if (staleCount > 0) {
      this.logger.info('Cleaned up stale agents', { count: staleCount });
      this.recordMetric('agents_cleaned', staleCount);
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    try {
      const agents = await this.getAllAgents();
      for (const agent of agents) {
        if (agent.connectionType === 'ws') {
          (agent.connection as WebSocket).terminate();
        } else {
          (agent.connection as Socket).disconnect(true);
        }
      }
      this.agents.clear();
      await this.cache.flushAll();
      this.recordMetric('service_cleanup', 1);
    } catch (error) {
      this.handleError(error, { service: 'AgentService', operation: 'cleanup' });
    }
  }
}
