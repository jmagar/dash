import { Server as SocketServer } from 'socket.io';
import { EventEmitter } from 'events';
import { LoggingManager } from '../managers/LoggingManager';
import { getAgentService } from './agent.service';
import type { ServerToClientEvents, ClientToServerEvents } from '../../types/socket-events';
import type { LogFilter, LogLevel } from '../../types/logger';
import type { HostId, SessionId, BaseEventPayload, HostEventPayload } from '../../types/socket.io';

interface LogSubscribePayload extends BaseEventPayload {
  hostId: HostId;
  filter?: Omit<LogFilter, 'level'> & {
    level?: LogLevel;
  };
}

interface LogUnsubscribePayload extends BaseEventPayload {
  hostId: HostId;
}

interface LogStreamPayload extends BaseEventPayload {
  hostId: HostId;
  sessionId: SessionId;
  data: string;
}

class LogService extends EventEmitter {
  private io: SocketServer<ClientToServerEvents, ServerToClientEvents>;
  private subscriptions: Map<string, Set<string>> = new Map(); // hostId -> Set of socketIds

  constructor(io: SocketServer<ClientToServerEvents, ServerToClientEvents>) {
    super();
    this.io = io;
    this.setupSocketHandlers();
    this.setupAgentHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      socket.on('process:monitor', async (payload: HostEventPayload) => {
        try {
          const hostId = payload.hostId;
          // Create or get subscriber set for this host
          if (!this.subscriptions.has(hostId)) {
            this.subscriptions.set(hostId, new Set());
          }
          this.subscriptions.get(hostId)?.add(socket.id);

          // Check if agent is connected
          const agentService = getAgentService();
          if (!agentService.isConnected(hostId)) {
            socket.emit('error', new Error(`Agent ${hostId} not connected`));
            return;
          }

          // Subscribe to agent logs
          try {
            const filter = payload.metadata?.filter as LogFilter | undefined;
            await agentService.subscribeToLogs(hostId, {
              ...filter,
              level: filter?.level === 'critical' ? 'error' : filter?.level
            });
            LoggingManager.getInstance().info('Subscribed to agent logs', {
              socketId: socket.id,
              hostId,
              filter
            });
          } catch (error) {
            LoggingManager.getInstance().error('Failed to subscribe to agent logs', {
              error: error instanceof Error ? error.message : String(error),
              socketId: socket.id,
              hostId
            });
            socket.emit('error', new Error(`Failed to subscribe to logs for agent ${hostId}`));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          LoggingManager.getInstance().error('Failed to process log subscription', {
            error: errorMessage,
            socketId: socket.id
          });
          socket.emit('error', new Error(errorMessage));
        }
      });

      socket.on('process:unmonitor', async (payload: HostEventPayload) => {
        try {
          const hostId = payload.hostId;
          // Remove socket from subscribers
          this.subscriptions.get(hostId)?.delete(socket.id);
          if (this.subscriptions.get(hostId)?.size === 0) {
            this.subscriptions.delete(hostId);
          }

          // Check if agent is connected
          const agentService = getAgentService();
          if (!agentService.isConnected(hostId)) {
            LoggingManager.getInstance().warn('Agent not connected for log unsubscribe', {
              socketId: socket.id,
              hostId
            });
            return;
          }

          // Unsubscribe from agent logs if no more subscribers
          if (!this.subscriptions.has(hostId)) {
            try {
              await agentService.unsubscribeFromLogs(hostId);
              LoggingManager.getInstance().info('Unsubscribed from agent logs', {
                socketId: socket.id,
                hostId
              });
            } catch (error) {
              LoggingManager.getInstance().error('Failed to unsubscribe from agent logs', {
                error: error instanceof Error ? error.message : String(error),
                socketId: socket.id,
                hostId
              });
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          LoggingManager.getInstance().error('Failed to process log unsubscription', {
            error: errorMessage,
            socketId: socket.id
          });
        }
      });

      socket.on('disconnect', () => {
        // Remove socket from all subscriptions
        for (const [hostId, subscribers] of this.subscriptions.entries()) {
          subscribers.delete(socket.id);
          if (subscribers.size === 0) {
            this.subscriptions.delete(hostId);
            
            // Unsubscribe from agent logs if no more subscribers
            const agentService = getAgentService();
            if (agentService.isConnected(hostId)) {
              agentService.unsubscribeFromLogs(hostId).catch((error) => {
                LoggingManager.getInstance().error('Failed to unsubscribe from agent logs on disconnect', {
                  error: error instanceof Error ? error.message : String(error),
                  socketId: socket.id,
                  hostId
                });
              });
            }
          }
        }
      });
    });
  }

  private setupAgentHandlers(): void {
    const agentService = getAgentService();
    agentService.on('terminal:data', (hostId: string, logs: unknown[]) => {
      const subscribers = this.subscriptions.get(hostId);
      if (subscribers) {
        const sessionId = 'default' as SessionId; // Use a default session ID for logs
        for (const socketId of subscribers) {
          this.io.to(socketId).emit('terminal:data', {
            hostId: hostId as HostId,
            sessionId,
            data: JSON.stringify(logs),
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    agentService.on('error', (hostId: string, error: string) => {
      const subscribers = this.subscriptions.get(hostId);
      if (subscribers) {
        for (const socketId of subscribers) {
          this.io.to(socketId).emit('error', new Error(`Log error from agent ${hostId}: ${error}`));
        }
      }
    });
  }
}

// Export singleton instance
export const logService = new LogService(global.io);
