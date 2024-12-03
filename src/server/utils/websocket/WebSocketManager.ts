import { Server as WebSocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import { z } from 'zod';
import { MetricsManager } from '../metrics/MetricsManager';
import { logger } from '../logger';
import { ConfigManager } from '../config/ConfigManager';
import { StateManager } from '../state/StateManager';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

export class WebSocketManager {
  private static instance: WebSocketManager;
  private io: WebSocketServer | null = null;
  private metricsManager: MetricsManager;
  private configManager: ConfigManager;
  private stateManager: StateManager;
  private connections: Map<string, Socket>;
  private messageHandlers: Map<string, Set<(data: any) => void>>;

  private constructor() {
    this.metricsManager = MetricsManager.getInstance();
    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
    this.connections = new Map();
    this.messageHandlers = new Map();

    // Initialize WebSocket metrics
    this.metricsManager.createGauge('websocket_connections_total', 'Total WebSocket connections');
    this.metricsManager.createCounter('websocket_messages_total', 'Total WebSocket messages');
    this.metricsManager.createCounter('websocket_errors_total', 'Total WebSocket errors');
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public initialize(server: Server) {
    this.io = new WebSocketServer(server, {
      cors: {
        origin: this.configManager.get<string[]>('cors.origins'),
        methods: ['GET', 'POST']
      }
    });

    this.io.use(this.authenticate.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));

    loggerLoggingManager.getInstance().();
  }

  private async authenticate(socket: Socket, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error('Authentication required');
      }

      // Verify token and attach user data to socket
      const userData = await this.verifyToken(token);
      socket.data.user = userData;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error('Authentication failed'));
    }
  }

  private async verifyToken(token: string): Promise<any> {
    // Implement token verification logic
    // This is a placeholder - replace with your actual token verification
    return { id: '1', name: 'user' };
  }

  private handleConnection(socket: Socket) {
    const userId = socket.data.user.id;
    this.connections.set(userId, socket);
    this.metricsManager.setGauge('websocket_connections_total', this.connections.size);

    loggerLoggingManager.getInstance().();

    socket.on('disconnect', () => {
      this.connections.delete(userId);
      this.metricsManager.setGauge('websocket_connections_total', this.connections.size);
      loggerLoggingManager.getInstance().();
    });

    // Handle messages
    socket.on('message', async (data: any) => {
      try {
        this.metricsManager.incrementCounter('websocket_messages_total', { userId });
        await this.handleMessage(userId, data);
      } catch (error) {
        this.metricsManager.incrementCounter('websocket_errors_total', { userId });
        loggerLoggingManager.getInstance().();
        socket.emit('error', { message: 'Message handling failed' });
      }
    });
  }

  private async handleMessage(userId: string, data: any) {
    // Validate message format
    const messageSchema = z.object({
      type: z.string(),
      payload: z.any()
    });

    const validatedData = messageSchema.parse(data);
    const handlers = this.messageHandlers.get(validatedData.type);

    if (handlers) {
      for (const handler of handlers) {
        await handler(validatedData.payload);
      }
    }

    // Update state if needed
    await this.stateManager.set(`lastMessage:${userId}`, {
      timestamp: Date.now(),
      type: validatedData.type
    });
  }

  public on(event: string, handler: (data: any) => void) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event)!.add(handler);
  }

  public off(event: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  public emit(userId: string, event: string, data: any) {
    const socket = this.connections.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  public broadcast(event: string, data: any, excludeUserId?: string) {
    for (const [userId, socket] of this.connections) {
      if (userId !== excludeUserId) {
        socket.emit(event, data);
      }
    }
  }
}

export default WebSocketManager.getInstance();

