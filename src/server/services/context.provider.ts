import { RedisClientType } from 'redis';
import { ChatbotContext, SystemState, FileSystemState, ProcessState, NetworkState, UserState, AppState } from '../../types/chatbot';
import { ContextCache } from '../cache/context.cache';
import { EventEmitter } from 'events';
import { cache } from '../cache';
import { db } from '../db';
import { metrics } from '../metrics';
import { LoggingManager } from '../utils/logging/LoggingManager';

export class ContextProvider extends EventEmitter {
  private static instance: ContextProvider;
  private contextCache: ContextCache;
  private context: ChatbotContext;

  private constructor(private readonly redis: RedisClientType) {
    super();
    this.contextCache = new ContextCache(redis);
    this.context = this.initializeContext();
  }

  public static getInstance(): ContextProvider {
    if (!ContextProvider.instance) {
      ContextProvider.instance = new ContextProvider(cache.getClient());
    }
    return ContextProvider.instance;
  }

  private initializeContext(): ChatbotContext {
    return {
      serviceContext: {} as any,
      systemState: {
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
        }
      },
      metadata: {}
    };
  }

  public async getCurrentContext(): Promise<ChatbotContext> {
    // Update system state before returning
    await this.updateSystemState();
    return this.context;
  }

  private async updateSystemState(): Promise<void> {
    try {
      const [cacheHealth, dbStatus, systemMetrics] = await Promise.all([
        cache.healthCheck(),
        this.getDbStatus(),
        this.getSystemMetrics()
      ]);

      this.context.systemState = {
        cacheStatus: {
          connected: cacheHealth.connected,
          state: cacheHealth.status as any,
          memoryUsage: cacheHealth.metrics.memory.used,
          totalKeys: cacheHealth.metrics.keys
        },
        dbStatus,
        activeHosts: await this.getActiveHosts(),
        metrics: systemMetrics
      };
    } catch (error) {
      LoggingManager.getInstance().error('Failed to update system state', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getDbStatus() {
    try {
      const pool = db as any;
      return {
        connected: pool.totalCount > 0,
        poolSize: pool.totalCount || 0,
        activeConnections: pool.activeCount || 0
      };
    } catch (error) {
      return {
        connected: false,
        poolSize: 0,
        activeConnections: 0
      };
    }
  }

  private async getSystemMetrics() {
    return {
      systemLoad: metrics.getMetric('system.load') || 0,
      memoryUsage: metrics.getMetric('system.memory.used') || 0,
      activeUsers: metrics.getMetric('users.active') || 0
    };
  }

  private async getActiveHosts(): Promise<any[]> {
    try {
      const result = await db.query('SELECT * FROM hosts WHERE status = $1', ['active']);
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  public async getContext(): Promise<ChatbotContext> {
    const [fileSystem, process, network, user, app, system] = await Promise.all([
      this.contextCache.getFileSystemState(),
      this.contextCache.getProcessState(),
      this.contextCache.getNetworkState(),
      this.contextCache.getUserState(),
      this.contextCache.getAppState(),
      this.contextCache.getSystemState()
    ]);

    return {
      fileSystem,
      process,
      network,
      user,
      app,
      system
    };
  }

  public async updateFileSystemState(state: FileSystemState): Promise<void> {
    await this.contextCache.cacheFileSystemState(state);
  }

  public async updateProcessState(state: ProcessState): Promise<void> {
    await this.contextCache.cacheProcessState(state);
  }

  public async updateNetworkState(state: NetworkState): Promise<void> {
    await this.contextCache.cacheNetworkState(state);
  }

  public async updateUserState(state: UserState): Promise<void> {
    await this.contextCache.cacheUserState(state);
  }

  public async updateAppState(state: AppState): Promise<void> {
    await this.contextCache.cacheAppState(state);
  }

  public async updateSystemState(state: SystemState): Promise<void> {
    await this.contextCache.cacheSystemState(state);
  }

  public async updateContext(context: Partial<ChatbotContext>): Promise<void> {
    const updates: Promise<void>[] = [];

    if (context.fileSystem) {
      updates.push(this.updateFileSystemState(context.fileSystem));
    }
    if (context.process) {
      updates.push(this.updateProcessState(context.process));
    }
    if (context.network) {
      updates.push(this.updateNetworkState(context.network));
    }
    if (context.user) {
      updates.push(this.updateUserState(context.user));
    }
    if (context.app) {
      updates.push(this.updateAppState(context.app));
    }
    if (context.system) {
      updates.push(this.updateSystemState(context.system));
    }

    await Promise.all(updates);
  }

  public updateContextMetadata(metadata: any): void {
    this.context.metadata = metadata;
    this.emit('context:metadata:updated', metadata);
  }

  public clearContext(): void {
    this.context = this.initializeContext();
    this.emit('context:cleared');
  }

  public setServiceContext(serviceContext: any): void {
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

