import { Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';
import { ConfigManager } from './ConfigManager';
import { MetricsManager } from './MetricsManager';
import { SecurityManager } from './SecurityManager';
import { LoggingManager } from './LoggingManager';
import { MonitoringManager } from './MonitoringManager';
import { AgentManager } from './AgentManager';
import { CacheManager } from './CacheManager';
import { DatabaseManager } from './DatabaseManager';
import { FileSystemManager } from './FileSystemManager';
import { RequestManager } from './RequestManager';
import { ServiceManager } from './ServiceManager';
import { StateManager } from './StateManager';
import { TaskManager } from './TaskManager';
import { WebSocketManager } from './WebSocketManager';

export interface ManagerDependencies {
  configManager: ConfigManager;
  metricsManager: MetricsManager;
  securityManager: SecurityManager;
  loggingManager: LoggingManager;
  monitoringManager: MonitoringManager;
  agentManager: AgentManager;
  cacheManager: CacheManager;
  databaseManager: DatabaseManager;
  fileSystemManager: FileSystemManager;
  requestManager: RequestManager;
  serviceManager: ServiceManager;
  stateManager: StateManager;
  taskManager: TaskManager;
  webSocketManager: WebSocketManager;
}

export interface BaseManagerDependencies {
  configManager: ConfigManager;
  metricsManager: MetricsManager;
  loggingManager: LoggingManager;
}

export interface SecurityManagerDependencies extends BaseManagerDependencies {
  readonly _type?: 'SecurityManagerDependencies';
}

export interface MonitoringManagerDependencies extends BaseManagerDependencies {
  readonly _type?: 'MonitoringManagerDependencies';
}

export interface AgentManagerDependencies extends BaseManagerDependencies {
  securityManager: SecurityManager;
  server: WebSocketServer;
}

export interface CacheManagerDependencies extends BaseManagerDependencies {
  readonly _type?: 'CacheManagerDependencies';
}

export interface DatabaseManagerDependencies extends BaseManagerDependencies {
  readonly _type?: 'DatabaseManagerDependencies';
}

export interface FileSystemManagerDependencies extends BaseManagerDependencies {
  securityManager: SecurityManager;
}

export interface RequestManagerDependencies extends BaseManagerDependencies {
  securityManager: SecurityManager;
  server: HttpServer;
}

export interface ServiceManagerDependencies extends BaseManagerDependencies {
  readonly _type?: 'ServiceManagerDependencies';
}

export interface StateManagerDependencies extends BaseManagerDependencies {
  readonly _type?: 'StateManagerDependencies';
}

export interface TaskManagerDependencies extends BaseManagerDependencies {
  readonly _type?: 'TaskManagerDependencies';
}

export interface WebSocketManagerDependencies extends BaseManagerDependencies {
  server: HttpServer;
}

class ManagerContainer {
  private static instance: ManagerContainer;
  private dependencies: Map<keyof ManagerDependencies, unknown> = new Map();
  private initialized = false;
  private httpServer?: HttpServer;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): ManagerContainer {
    if (!ManagerContainer.instance) {
      ManagerContainer.instance = new ManagerContainer();
    }
    return ManagerContainer.instance;
  }

  public register<K extends keyof ManagerDependencies>(
    key: K, 
    manager: ManagerDependencies[K]
  ): void {
    this.dependencies.set(key, manager);
  }

  public get<K extends keyof ManagerDependencies>(key: K): ManagerDependencies[K] {
    const manager = this.dependencies.get(key);
    if (!manager) {
      throw new Error(`Manager ${String(key)} not registered`);
    }
    return manager as ManagerDependencies[K];
  }

  private async startServer(port: number, host: string, loggingManager: LoggingManager): Promise<void> {
    if (!this.httpServer) {
      throw new Error('HTTP server not initialized');
    }

    return new Promise<void>((resolve, reject) => {
      const server = this.httpServer;
      if (!server) {
        reject(new Error('HTTP server not initialized'));
        return;
      }

      const errorHandler = (error: Error) => {
        loggingManager.error('Server failed to start', { error: error.message });
        server.off('error', errorHandler);
        reject(error);
      };

      server.on('error', errorHandler);

      void server.listen(port, host, () => {
        server.off('error', errorHandler);
        loggingManager.info('Server started', { port, host });
        resolve();
      });
    });
  }

  public async initializeAll(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const configManager = ConfigManager.getInstance();
      const metricsManager = MetricsManager.getInstance();
      const loggingManager = LoggingManager.getInstance();

      this.register('configManager', configManager);
      this.register('metricsManager', metricsManager);
      this.register('loggingManager', loggingManager);

      const baseDependencies: BaseManagerDependencies = {
        configManager,
        metricsManager,
        loggingManager
      };

      const securityManager = SecurityManager.getInstance();
      void securityManager.initialize(baseDependencies);
      this.register('securityManager', securityManager);

      const monitoringManager = MonitoringManager.getInstance();
      void monitoringManager.initialize(baseDependencies);
      this.register('monitoringManager', monitoringManager);

      this.httpServer = new HttpServer();
      const wsServer = new WebSocketServer({ server: this.httpServer });

      const agentManager = AgentManager.getInstance();
      void agentManager.initialize({
        ...baseDependencies,
        securityManager,
        server: wsServer
      } as AgentManagerDependencies);
      this.register('agentManager', agentManager);

      const cacheManager = CacheManager.getInstance();
      void cacheManager.initialize(baseDependencies as CacheManagerDependencies);
      this.register('cacheManager', cacheManager);

      const databaseManager = DatabaseManager.getInstance();
      void databaseManager.initialize(baseDependencies as DatabaseManagerDependencies);
      this.register('databaseManager', databaseManager);

      const fileSystemManager = FileSystemManager.getInstance();
      void fileSystemManager.initialize({
        ...baseDependencies,
        securityManager
      } as FileSystemManagerDependencies);
      this.register('fileSystemManager', fileSystemManager);

      const port = configManager.getConfig('server.port', 3000);
      const host = configManager.getConfig('server.host', 'localhost');
      await this.startServer(port, host, loggingManager);

      this.initialized = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize managers: ${errorMessage}`);
    }
  }

  public async reset(): Promise<void> {
    if (this.httpServer) {
      await new Promise<void>((resolve, reject) => {
        this.httpServer?.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    this.dependencies.clear();
    this.initialized = false;
    this.httpServer = undefined;
  }
}

export const managerContainer = ManagerContainer.getInstance();
