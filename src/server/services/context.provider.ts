import { RedisClientType } from 'redis';
import { 
  ChatbotContext, 
  SystemState, 
  FileSystemState, 
  ProcessState, 
  NetworkState,
  DockerState,
  LogState,
  CacheStatus,
  DatabaseStatus,
  SystemMetrics
} from '../../types/chatbot';
import { EventEmitter } from 'events';
import { db } from '../db';
import { metrics } from '../metrics';
import { LoggingManager } from '../managers/LoggingManager';

export class ContextProvider extends EventEmitter {
  private static instance: ContextProvider;
  private context: ChatbotContext;
  private logger: LoggingManager;

  private constructor(private readonly redis: RedisClientType) {
    super();
    this.context = this.initializeContext();
    this.logger = LoggingManager.getInstance();
  }

  public static getInstance(): ContextProvider {
    if (!ContextProvider.instance) {
      // Redis client should be passed in from the caller
      ContextProvider.instance = new ContextProvider(null as any);
    }
    return ContextProvider.instance;
  }

  private initializeContext(): ChatbotContext {
    const initialSystemState: SystemState = {
      cacheStatus: {
        connected: false,
        state: 'disconnected',
        memoryUsage: 0,
        totalKeys: 0
      },
      dbStatus: {
        connected: false,
        poolSize: 0,
        activeConnections: 0
      },
      activeHosts: [],
      metrics: {
        systemLoad: 0,
        memoryUsage: 0,
        activeUsers: 0
      },
      fileSystem: {
        currentDirectory: '',
        recentFiles: [],
        watchedDirectories: [],
        mountPoints: []
      },
      docker: {
        containers: [],
        images: [],
        networks: [],
        volumes: [],
        stacks: []
      },
      logs: {
        recentLogs: [],
        errorCount: {
          last1h: 0,
          last24h: 0,
          total: 0
        },
        logFiles: []
      },
      processes: {
        running: [],
        systemLoad: {
          '1m': 0,
          '5m': 0,
          '15m': 0
        },
        memory: {
          total: 0,
          used: 0,
          free: 0,
          cached: 0
        }
      },
      network: {
        connections: [],
        interfaces: []
      }
    };

    return {
      serviceContext: {
        id: '',
        timestamp: new Date(),
        metadata: {}
      },
      systemState: initialSystemState,
      metadata: {}
    };
  }

  public async getCurrentContext(): Promise<ChatbotContext> {
    await this.updateSystemState();
    return this.context;
  }

  private async updateSystemState(): Promise<void> {
    try {
      const [dbStatus, systemMetrics] = await Promise.all([
        this.getDbStatus(),
        this.getSystemMetrics()
      ]);

      const activeHosts = await this.getActiveHosts();

      this.context.systemState = {
        ...this.context.systemState,
        dbStatus,
        metrics: systemMetrics,
        activeHosts
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to update system state', { error: errorMessage });
    }
  }

  private async getDbStatus(): Promise<DatabaseStatus> {
    try {
      const pool = db as any;
      const totalCount = await pool.totalCount();
      const activeCount = await pool.activeCount();
      return {
        connected: totalCount > 0,
        poolSize: totalCount || 0,
        activeConnections: activeCount || 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get database status', { error: errorMessage });
      return {
        connected: false,
        poolSize: 0,
        activeConnections: 0
      };
    }
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Record current metrics
      const cpuUsage = process.cpuUsage().system / 1000000; // Convert to seconds
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // Convert to MB
      const activeUsers = 0; // This should be updated with actual user count

      // Update metrics
      await Promise.all([
        metrics.gauge('system.load', cpuUsage),
        metrics.gauge('system.memory', memoryUsage),
        metrics.gauge('system.users', activeUsers)
      ]);

      return {
        systemLoad: cpuUsage,
        memoryUsage: memoryUsage,
        activeUsers: activeUsers
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get system metrics', { error: errorMessage });
      return {
        systemLoad: 0,
        memoryUsage: 0,
        activeUsers: 0
      };
    }
  }

  private async getActiveHosts(): Promise<any[]> {
    try {
      const result = await db.query('SELECT * FROM hosts WHERE status = $1', ['active']);
      return result.rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get active hosts', { error: errorMessage });
      return [];
    }
  }

  public updateContext(context: Partial<ChatbotContext>): void {
    if (context.systemState) {
      this.context.systemState = {
        ...this.context.systemState,
        ...context.systemState
      };
    }

    if (context.serviceContext) {
      this.context.serviceContext = {
        ...this.context.serviceContext,
        ...context.serviceContext
      };
    }

    if (context.metadata) {
      this.context.metadata = {
        ...this.context.metadata,
        ...context.metadata
      };
    }

    this.emit('context:updated', this.context);
  }

  public updateContextMetadata(metadata: Record<string, unknown>): void {
    this.context.metadata = {
      ...this.context.metadata,
      ...metadata
    };
    this.emit('context:metadata:updated', this.context.metadata);
  }

  public clearContext(): void {
    this.context = this.initializeContext();
    this.emit('context:cleared');
  }

  public setServiceContext(serviceContext: ChatbotContext['serviceContext']): void {
    this.context.serviceContext = serviceContext;
    this.emit('context:service:updated', serviceContext);
  }

  public updateLastQuery(query: string, result: unknown): void {
    this.context.lastQuery = {
      timestamp: new Date(),
      query,
      result
    };
    this.emit('context:query:updated', this.context.lastQuery);
  }
}
