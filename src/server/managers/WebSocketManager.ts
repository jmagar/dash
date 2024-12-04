import { Server as WebSocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import { z } from 'zod';
import { MetricsManager } from '../metrics/MetricsManager';
import { ConfigManager } from '../config/ConfigManager';
import { StateManager } from '../state/StateManager';
import { LoggingManager } from '../logging/LoggingManager';
import { BaseService } from '../services/base.service';
import { SecurityManager } from './SecurityManager';

// Enhanced Zod Schemas
const WebSocketConfigSchema = z.object({
  cors: z.object({
    origins: z.array(z.string()).default(['*']),
    methods: z.array(z.string()).default(['GET', 'POST'])
  }).default({}),
  connectionTimeout: z.number().min(1000).max(30000).default(5000),
  maxConnections: z.number().min(1).max(1000).default(100)
});

const MessageSchema = z.object({
  type: z.string().min(1, "Message type must be non-empty"),
  payload: z.any().optional(),
  timestamp: z.number().optional()
});

// WebSocket Manager Dependencies Interface
interface WebSocketManagerDependencies {
  metricsManager?: MetricsManager;
  configManager?: ConfigManager;
  stateManager?: StateManager;
  loggingManager?: LoggingManager;
  securityManager?: SecurityManager;
}

export class WebSocketManager extends BaseService {
  private static instance: WebSocketManager;
  private io: WebSocketServer | null = null;
  private metricsManager: MetricsManager;
  private configManager: ConfigManager;
  private stateManager: StateManager;
  private securityManager: SecurityManager;
  private loggingManager: LoggingManager;
  private connections: Map<string, Socket>;
  private messageHandlers: Map<string, Set<(data: any) => Promise<void>>>;
  private config: z.infer<typeof WebSocketConfigSchema>;

  private constructor(dependencies?: WebSocketManagerDependencies) {
    super({
      name: 'websocket-manager',
      version: '1.1.0'
    });

    // Dependency Injection with Fallback
    this.metricsManager = dependencies?.metricsManager ?? MetricsManager.getInstance();
    this.configManager = dependencies?.configManager ?? ConfigManager.getInstance();
    this.stateManager = dependencies?.stateManager ?? StateManager.getInstance();
    this.securityManager = dependencies?.securityManager ?? SecurityManager.getInstance();
    this.loggingManager = dependencies?.loggingManager ?? LoggingManager.getInstance();

    this.connections = new Map();
    this.messageHandlers = new Map();

    // Validate and set configuration
    this.config = WebSocketConfigSchema.parse(
      this.configManager.get('websocket', {})
    );

    // Enhanced Metrics Tracking
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metricsManager.createGauge('websocket_connections_total', 'Total WebSocket connections');
    this.metricsManager.createCounter('websocket_messages_total', 'Total WebSocket messages');
    this.metricsManager.createCounter('websocket_errors_total', 'Total WebSocket errors');
    this.metricsManager.createHistogram('websocket_connection_duration', 'WebSocket connection duration');
  }

  public static getInstance(dependencies?: WebSocketManagerDependencies): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager(dependencies);
    }
    return WebSocketManager.instance;
  }

  public async init(): Promise<void> {
    try {
      if (this.io) {
        this.loggingManager.warn('WebSocket server already initialized');
        return;
      }

      this.io = new WebSocketServer({
        cors: {
          origin: this.config.cors.origins,
          methods: this.config.cors.methods
        },
        connectionStateRecovery: {
          maxDisconnectionDuration: this.config.connectionTimeout
        }
      });

      this.io.use(this.authenticate.bind(this));
      this.io.on('connection', this.handleConnection.bind(this));

      this.loggingManager.info('WebSocket manager initialized successfully', {
        origins: this.config.cors.origins,
        maxConnections: this.config.maxConnections
      });
    } catch (error) {
      this.loggingManager.error('Failed to initialize WebSocket manager', { error });
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      // Graceful disconnection
      for (const socket of this.connections.values()) {
        socket.disconnect(true);
      }
      this.connections.clear();
      this.messageHandlers.clear();

      if (this.io) {
        this.io.close();
        this.io = null;
      }

      this.loggingManager.info('WebSocket manager cleaned up successfully');
    } catch (error) {
      this.loggingManager.error('Error during WebSocket manager cleanup', { error });
      throw error;
    }
  }

  public async getHealth(): Promise<{ status: 'healthy' | 'unhealthy' | 'degraded'; details?: Record<string, unknown>; }> {
    try {
      const connectedClients = this.connections.size;
      const status = connectedClients < this.config.maxConnections 
        ? 'healthy' 
        : (connectedClients > this.config.maxConnections * 0.9 ? 'degraded' : 'unhealthy');

      return {
        status,
        details: {
          serverStatus: this.io ? 'running' : 'stopped',
          connectedClients,
          maxConnections: this.config.maxConnections,
          registeredHandlers: Array.from(this.messageHandlers.keys())
        }
      };
    } catch (error) {
      this.loggingManager.error('WebSocket manager health check failed', { error });
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async authenticate(socket: Socket, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error('Authentication token required');
      }

      const userData = await this.securityManager.verifyToken(token);
      socket.data.user = userData;

      // Additional connection validation
      const clientIp = socket.handshake.address;
      if (!this.securityManager.isAllowedConnection(clientIp)) {
        throw new Error('Connection not allowed from this IP');
      }

      next();
    } catch (error) {
      this.loggingManager.warn('WebSocket authentication failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      next(error instanceof Error ? error : new Error('Authentication failed'));
    }
  }

  private handleConnection(socket: Socket) {
    const startTime = Date.now();
    const userId = socket.data.user.id;

    // Enforce max connections
    if (this.connections.size >= this.config.maxConnections) {
      this.loggingManager.warn('Max WebSocket connections reached', { 
        currentConnections: this.connections.size 
      });
      socket.disconnect(true);
      return;
    }

    this.connections.set(userId, socket);
    this.metricsManager.setGauge('websocket_connections_total', this.connections.size);

    socket.on('disconnect', () => {
      const connectionDuration = Date.now() - startTime;
      this.metricsManager.recordHistogram('websocket_connection_duration', connectionDuration);
      
      this.connections.delete(userId);
      this.metricsManager.setGauge('websocket_connections_total', this.connections.size);
    });

    socket.on('message', async (data: any) => {
      try {
        this.metricsManager.incrementCounter('websocket_messages_total', { userId });
        await this.handleMessage(userId, data);
      } catch (error) {
        this.metricsManager.incrementCounter('websocket_errors_total', { userId });
        this.loggingManager.error('WebSocket message handling failed', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          userId 
        });
        socket.emit('error', { message: 'Message handling failed' });
      }
    });
  }

  private async handleMessage(userId: string, data: any) {
    try {
      const validatedData = MessageSchema.parse(data);
      const handlers = this.messageHandlers.get(validatedData.type);

      if (handlers) {
        for (const handler of handlers) {
          await handler(validatedData.payload);
        }
      }

      // Update state with enhanced tracking
      await this.stateManager.set(`lastMessage:${userId}`, {
        timestamp: Date.now(),
        type: validatedData.type,
        payload: validatedData.payload
      });
    } catch (error) {
      this.loggingManager.warn('Invalid WebSocket message', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId 
      });
      throw error;
    }
  }

  public on(event: string, handler: (data: any) => Promise<void>) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event)!.add(handler);
  }

  public off(event: string, handler: (data: any) => Promise<void>) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  public emit(userId: string, event: string, data: any) {
    const socket = this.connections.get(userId);
    if (socket) {
      socket.emit(event, data);
    } else {
      this.loggingManager.warn('Attempted to emit to non-existent connection', { 
        userId, 
        event 
      });
    }
  }

  public broadcast(event: string, data: any, excludeUserId?: string) {
    for (const [userId, socket] of this.connections) {
      if (userId !== excludeUserId) {
        socket.emit(event, data);
      }
    }
  }

  public attachToServer(server: Server) {
    if (this.io) {
      this.loggingManager.warn('WebSocket server already attached to HTTP server');
      return;
    }

    this.io = new WebSocketServer(server, {
      cors: {
        origin: this.config.cors.origins,
        methods: this.config.cors.methods
      }
    });

    this.io.use(this.authenticate.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));

    this.loggingManager.info('WebSocket server attached to HTTP server');
  }
}

export default WebSocketManager.getInstance();
