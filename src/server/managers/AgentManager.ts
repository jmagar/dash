import { WebSocketServer } from 'ws';
import { ServiceHealth } from '../../types/service';
import { AgentEntity } from '../../types/agent';
import { BaseManagerDependencies } from './ManagerContainer';
import { BaseService, ServiceConfig } from '../services/base.service';
import { LoggingManager } from './LoggingManager';
import { MetricsManager } from './MetricsManager';
import { SecurityManager } from './SecurityManager';

// Manually define ServiceStatus enum since it's not in the imported types
export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

type ManagerDependencies = {
  loggingManager: LoggingManager;
  metricsManager: MetricsManager;
  securityManager: SecurityManager;
  server: WebSocketServer;
};

type HealthCheckResult = {
  status: ServiceStatus;
  details: {
    resources?: {
      connections: number;
    };
    error?: string;
  };
  lastCheck: Date;
};

const AGENT_SERVICE_CONFIG: ServiceConfig = {
  retryOptions: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    factor: 2,
    timeout: 30000
  },
  cacheOptions: {
    ttl: 300,
    prefix: 'agent:'
  },
  metricsEnabled: true,
  loggingEnabled: true,
  validation: {
    strict: true
  }
};

// Local implementation of error to string conversion
function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export class AgentManager extends BaseService {
  private static instance: AgentManager;
  private agents: Map<string, AgentEntity> = new Map();
  private server?: WebSocketServer;
  private loggingManager?: LoggingManager;
  private metricsManager?: MetricsManager;
  private securityManager?: SecurityManager;

  private constructor() {
    super(AGENT_SERVICE_CONFIG);
  }

  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  private isValidDependencies(deps: Partial<ManagerDependencies>): deps is ManagerDependencies {
    return !!(
      deps.loggingManager && 
      deps.metricsManager && 
      deps.securityManager && 
      deps.server
    );
  }

  public initialize(deps: BaseManagerDependencies & { 
    securityManager: SecurityManager, 
    server: WebSocketServer 
  }): void {
    if (!this.isValidDependencies(deps)) {
      throw new Error('Invalid manager dependencies');
    }

    this.loggingManager = deps.loggingManager;
    this.metricsManager = deps.metricsManager;
    this.securityManager = deps.securityManager;
    this.server = deps.server;

    this.initializeMetrics();
  }

  private checkPermission(): boolean {
    if (!this.securityManager || !this.loggingManager) {
      return false;
    }

    try {
      // Assuming SecurityManager has a method to check permissions
      return true; // TODO: Implement actual permission check
    } catch (error) {
      this.loggingManager.error('Permission check failed', { 
        error: errorToString(error) 
      });
      return false;
    }
  }

  private initializeMetrics(): void {
    if (!this.metricsManager) return;

    this.metricsManager.createCounter('agent_health_checks_total', 'Total number of agent health checks');
    this.metricsManager.createGauge('connected_agents_total', 'Total number of connected agents');
  }

  public init(): void {
    if (!this.loggingManager || !this.metricsManager || !this.securityManager) {
      throw new Error('Managers not initialized');
    }

    try {
      this.loggingManager.info('Agent Manager initializing');
      
      // Optional security check
      const isAllowed = this.checkPermission();
      if (!isAllowed) {
        throw new Error('Not authorized to initialize agent manager');
      }
    } catch (error) {
      this.loggingManager.error('Agent Manager initialization failed', { 
        error: errorToString(error) 
      });
      throw error;
    }
  }

  public getHealth(): HealthCheckResult {
    if (!this.loggingManager || !this.metricsManager) {
      return {
        status: ServiceStatus.UNHEALTHY,
        details: { error: 'Managers not initialized' },
        lastCheck: new Date()
      };
    }

    const activeAgents = this.agents.size;
    
    // Increment health check counter
    this.metricsManager.incrementCounter('agent_health_checks_total');

    const status = activeAgents > 0 
      ? ServiceStatus.HEALTHY 
      : ServiceStatus.DEGRADED;

    return {
      status,
      details: {
        resources: {
          connections: activeAgents
        }
      },
      lastCheck: new Date()
    };
  }

  public async shutdown(): Promise<void> {
    if (!this.loggingManager || !this.server) {
      throw new Error('Managers or server not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        // Terminate all agent connections
        this.agents.forEach((agent) => {
          if (agent && typeof agent.status === 'string') {
            // Optionally add termination logic if needed
          }
        });
        this.agents.clear();

        // Close WebSocket server
        if (this.server && typeof this.server.close === 'function') {
          this.server.close((err?: Error) => {
            if (err) {
              this.loggingManager?.error('Error closing WebSocket server', { error: err.message });
              reject(err);
            } else {
              this.loggingManager?.info('WebSocket server shut down');
              resolve();
            }
          });
        } else {
          resolve();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.loggingManager?.error('Error during shutdown', { error: errorMessage });
        reject(new Error(errorMessage));
      }
    });
  }
}
