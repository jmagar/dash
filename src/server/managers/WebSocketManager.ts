// Node.js built-in modules
import { Server as HttpServer } from 'http';

// External libraries
import { Server as WebSocketServer, Socket } from 'socket.io';
import { z } from 'zod';

// Local imports
import { BaseService } from './base/BaseService';
import { ConfigManager } from './ConfigManager';
import { LoggingManager } from './LoggingManager';
import { MetricsManager } from './MetricsManager';
import { SecurityManager } from './SecurityManager';
import { StateManager } from './StateManager';
import { ServiceHealth, ServiceStatus } from './base/types';

// Configuration Schema
const WebSocketConfigSchema = z.object({
  cors: z.object({
    origins: z.array(z.string()).default(['*']),
    methods: z.array(z.string()).default(['GET', 'POST'])
  }).default({}),
  connectionTimeout: z.number().min(1000).max(30000).default(5000),
  maxConnections: z.number().min(1).max(1000).default(100)
});

// Type Definitions
type WebSocketConfig = z.infer<typeof WebSocketConfigSchema>;

export interface WebSocketManagerDependencies {
  configManager?: ConfigManager;
  metricsManager?: MetricsManager;
  loggingManager?: LoggingManager;
  securityManager?: SecurityManager;
  stateManager?: StateManager;
}

export interface WebSocketMessageHandler {
  (data: unknown): Promise<void>;
}

export class WebSocketManager extends BaseService {
  private static instance: WebSocketManager;
  
  private io: WebSocketServer | null = null;
  private config: WebSocketConfig;
  
  private configManager: ConfigManager;
  private metricsManager: MetricsManager;
  private loggingManager: LoggingManager;
  private securityManager: SecurityManager;
  private stateManager: StateManager;

  private connections: Map<string, Socket> = new Map();
  private messageHandlers: Map<string, Set<WebSocketMessageHandler>> = new Map();

  private connectionMetric: ReturnType<typeof MetricsManager.prototype.createGauge>;
  private messageMetric: ReturnType<typeof MetricsManager.prototype.createCounter>;
  private errorMetric: ReturnType<typeof MetricsManager.prototype.createCounter>;
  private connectionDurationMetric: ReturnType<typeof MetricsManager.prototype.createHistogram>;

  private constructor(private dependencies?: WebSocketManagerDependencies) {
    super({
      name: 'WebSocketManager',
      version: '1.1.0',
      dependencies: [
        'ConfigManager', 
        'MetricsManager', 
        'LoggingManager', 
        'SecurityManager', 
        'StateManager'
      ]
    });

    // Dependency Injection with Fallback
    this.configManager = dependencies?.configManager ?? ConfigManager.getInstance();
    this.metricsManager = dependencies?.metricsManager ?? MetricsManager.getInstance();
    this.loggingManager = dependencies?.loggingManager ?? LoggingManager.getInstance();
    this.securityManager = dependencies?.securityManager ?? SecurityManager.getInstance();
    this.stateManager = dependencies?.stateManager ?? StateManager.getInstance();

    // Validate and set configuration
    this.config = WebSocketConfigSchema.parse(
      this.configManager.get('websocket', {})
    );

    this.initializeMetrics();
  }

  public static getInstance(dependencies?: WebSocketManagerDependencies): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager(dependencies);
    }
    return WebSocketManager.instance;
  }

  private initializeMetrics(): void {
    this.connectionMetric = this.metricsManager.createGauge({
      name: 'websocket_connections_total',
      help: 'Total WebSocket connections'
    });

    this.messageMetric = this.metricsManager.createCounter({
      name: 'websocket_messages_total',
      help: 'Total WebSocket messages',
      labelNames: ['type']
    });

    this.errorMetric = this.metricsManager.createCounter({
      name: 'websocket_errors_total',
      help: 'Total WebSocket errors',
      labelNames: ['type']
    });

    this.connectionDurationMetric = this.metricsManager.createHistogram({
      name: 'websocket_connection_duration_seconds',
      help: 'WebSocket connection duration',
      buckets: [1, 5, 10, 30, 60, 120]
    });
  }

  async init(): Promise<void> {
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
      this.loggingManager.error('Failed to initialize WebSocket manager', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async getHealth(): Promise<ServiceHealth> {
    try {
      const connectedClients = this.connections.size;
      const status = connectedClients < this.config.maxConnections 
        ? ServiceStatus.HEALTHY 
        : (connectedClients > this.config.maxConnections * 0.9 
          ? ServiceStatus.DEGRADED 
          : ServiceStatus.UNHEALTHY);

      return {
        status,
        version: this.version,
        details: {
          serverStatus: this.io ? 'running' : 'stopped',
          connectedClients,
          maxConnections: this.config.maxConnections,
          registeredHandlers: Array.from(this.messageHandlers.keys())
        }
      };
    } catch (error) {
      this.loggingManager.error('WebSocket manager health check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return {
        status: ServiceStatus.UNHEALTHY,
        version: this.version,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async authenticate(socket: Socket, next: (err?: Error) => void): Promise<void> {
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

  private handleConnection(socket: Socket): void {
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
    this.connectionMetric.set(this.connections.size);

    socket.on('disconnect', () => {
      const connectionDuration = (Date.now() - startTime) / 1000; // Convert to seconds
      this.connectionDurationMetric.observe(connectionDuration);
      
      this.connections.delete(userId);
      this.connectionMetric.set(this.connections.size);
    });

    socket.on('message', async (data: unknown) => {
      try {
        this.messageMetric.inc({ type: 'received' });
        await this.handleMessage(userId, data);
      } catch (error) {
        this.errorMetric.inc({ type: 'message_handling' });
        this.loggingManager.error('WebSocket message handling failed', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          userId 
        });
        socket.emit('error', { message: 'Message handling failed' });
      }
    });
  }

  private async handleMessage(userId: string, data: unknown): Promise<void> {
    try {
      // Validate message structure if needed
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid message format');
      }

      const messageType = (data as { type?: string }).type;
      if (!messageType) {
        throw new Error('Message type is required');
      }

      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        for (const handler of handlers) {
          await handler(data);
        }
      }

      // Update state with enhanced tracking
      await this.stateManager.set(`lastMessage:${userId}`, {
        timestamp: Date.now(),
        type: messageType,
        payload: data
      });
    } catch (error) {
      this.loggingManager.warn('Invalid WebSocket message', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId 
      });
      throw error;
    }
  }

  public on(event: string, handler: WebSocketMessageHandler): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event)!.add(handler);
  }

  public off(event: string, handler: WebSocketMessageHandler): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  public emit(userId: string, event: string, data: unknown): void {
    const socket = this.connections.get(userId);
    if (socket) {
      socket.emit(event, data);
      this.messageMetric.inc({ type: 'sent' });
    } else {
      this.loggingManager.warn('Attempted to emit to non-existent connection', { 
        userId, 
        event 
      });
    }
  }

  public broadcast(event: string, data: unknown, excludeUserId?: string): void {
    for (const [userId, socket] of this.connections) {
      if (userId !== excludeUserId) {
        socket.emit(event, data);
        this.messageMetric.inc({ type: 'broadcast' });
      }
    }
  }

  public attachToServer(server: HttpServer): void {
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

  async cleanup(): Promise<void> {
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
      this.loggingManager.error('Error during WebSocket manager cleanup', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }
}

export default WebSocketManager.getInstance();
