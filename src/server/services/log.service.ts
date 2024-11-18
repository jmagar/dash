import { Server as SocketServer } from 'socket.io';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { agentService } from './agent.service';
import type { LogEntry, LogFilter , ServerToClientEvents, ClientToServerEvents } from '../../types/socket-events';

class LogService extends EventEmitter {
  private io: SocketServer<ClientToServerEvents, ServerToClientEvents>;
  private subscribers: Map<string, Set<string>> = new Map(); // hostId -> Set of socketIds

  constructor(io: SocketServer<ClientToServerEvents, ServerToClientEvents>) {
    super();
    this.io = io;
    this.setupSocketHandlers();
    this.setupAgentHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      socket.on('logs:subscribe', async ({ hostIds, filter }) => {
        try {
          for (const hostId of hostIds) {
            // Create or get subscriber set for this host
            if (!this.subscribers.has(hostId)) {
              this.subscribers.set(hostId, new Set());
            }
            this.subscribers.get(hostId)?.add(socket.id);

            // Check if agent is connected
            if (!agentService.isConnected(hostId)) {
              socket.emit('logs:error', {
                error: `Agent ${hostId} not connected`
              });
              continue;
            }

            // Subscribe to agent logs
            try {
              await agentService.subscribeToLogs(hostId, filter);
              logger.info('Subscribed to agent logs', {
                socketId: socket.id,
                hostId,
                filter
              });
            } catch (error) {
              logger.error('Failed to subscribe to agent logs', {
                error: error instanceof Error ? error.message : String(error),
                socketId: socket.id,
                hostId
              });
              socket.emit('logs:error', {
                error: 'Failed to subscribe to logs'
              });
            }
          }
        } catch (error) {
          logger.error('Failed to handle log subscription', {
            error: error instanceof Error ? error.message : String(error),
            socketId: socket.id,
            hostIds
          });
        }
      });

      socket.on('logs:unsubscribe', ({ hostIds }) => {
        try {
          for (const hostId of hostIds) {
            // Remove socket from subscribers
            this.subscribers.get(hostId)?.delete(socket.id);

            // If no more subscribers for this host, unsubscribe from agent
            if (this.subscribers.get(hostId)?.size === 0) {
              this.subscribers.delete(hostId);
              if (agentService.isConnected(hostId)) {
                agentService.unsubscribeFromLogs(hostId).catch(error => {
                  logger.error('Failed to unsubscribe from agent logs', {
                    error: error instanceof Error ? error.message : String(error),
                    hostId
                  });
                });
              }
            }
          }

          logger.info('Unsubscribed from logs', {
            socketId: socket.id,
            hostIds
          });
        } catch (error) {
          logger.error('Failed to handle log unsubscription', {
            error: error instanceof Error ? error.message : String(error),
            socketId: socket.id,
            hostIds
          });
        }
      });

      socket.on('disconnect', () => {
        // Remove socket from all subscriptions
        this.subscribers.forEach((subscribers, hostId) => {
          subscribers.delete(socket.id);
          if (subscribers.size === 0) {
            this.subscribers.delete(hostId);
            if (agentService.isConnected(hostId)) {
              agentService.unsubscribeFromLogs(hostId).catch(error => {
                logger.error('Failed to unsubscribe from agent logs on disconnect', {
                  error: error instanceof Error ? error.message : String(error),
                  hostId
                });
              });
            }
          }
        });
      });
    });
  }

  private setupAgentHandlers(): void {
    // Handle log entries from agents
    agentService.on('agent:logs', ({ hostId, logs }) => {
      const subscribers = this.subscribers.get(hostId);
      if (subscribers) {
        subscribers.forEach(socketId => {
          this.io.to(socketId).emit('logs:stream', { logs });
        });
      }
    });

    // Handle agent disconnection
    agentService.on('agent:disconnected', ({ hostId }) => {
      const subscribers = this.subscribers.get(hostId);
      if (subscribers) {
        subscribers.forEach(socketId => {
          this.io.to(socketId).emit('logs:error', {
            error: 'Agent disconnected'
          });
        });
      }
    });
  }
}

// Export singleton instance
export const logService = new LogService(global.io);
