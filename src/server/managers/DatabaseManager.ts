// Node.js built-in modules
import { EventEmitter } from 'events';

// External libraries
import { PrismaClient } from '@prisma/client';
import { Sequelize, Options as SequelizeOptions } from 'sequelize';
import { z } from 'zod';

// Local imports
import { BaseService } from '../services/base.service';
import { ConfigManager } from './ConfigManager';
import { LoggingManager } from './LoggingManager';
import { MetricsManager } from './MetricsManager';
import { SecurityManager } from './SecurityManager';
import { BaseManagerDependencies } from './ManagerContainer';

// Zod Schemas for Configuration
const DatabaseConfigSchema = z.object({
  primary: z.object({
    type: z.enum(['prisma', 'sequelize']),
    url: z.string().url(),
    maxConnections: z.number().positive().default(10),
    connectionTimeout: z.number().positive().default(30000),
  }),
  secondary: z.object({
    type: z.enum(['prisma', 'sequelize']).optional(),
    url: z.string().url().optional(),
    maxConnections: z.number().positive().default(5),
    connectionTimeout: z.number().positive().default(30000),
  }).optional(),
});

// Transaction Options Schema
const TransactionOptionsSchema = z.object({
  timeout: z.number().int().min(1000).max(300000).optional().default(30000),
  maxAttempts: z.number().int().min(1).max(10).optional().default(3)
}).strict();

// Dependency interface for explicit dependency injection
interface DatabaseManagerDependencies extends BaseManagerDependencies {
  securityManager?: SecurityManager;
}

export class DatabaseManager extends BaseService {
  private static instance: DatabaseManager;

  private prismaClient: PrismaClient;
  private sequelizeClient: Sequelize;
  private dependencies: DatabaseManagerDependencies;
  private config: z.infer<typeof DatabaseConfigSchema>;
  private eventEmitter: EventEmitter;

  private constructor() {
    super({
      name: 'database-manager',
      version: '1.0.0'
    });

    this.eventEmitter = new EventEmitter();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public initialize(deps: DatabaseManagerDependencies): void {
    this.dependencies = deps;
    this.dependencies.loggingManager?.info('Database Manager initializing');

    // Validate and parse database configuration
    const rawConfig = deps.configManager.getConfig('database');
    this.config = DatabaseConfigSchema.parse(rawConfig);

    this.setupMetrics();
    this.setupClients();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    process.on('unhandledRejection', (reason, promise) => {
      this.dependencies.loggingManager?.error('Unhandled Rejection in DatabaseManager', { 
        reason, 
        promise 
      });
      this.dependencies.metricsManager?.incrementCounter('database_unhandled_rejections_total');
    });

    process.on('uncaughtException', (error) => {
      this.dependencies.loggingManager?.error('Uncaught Exception in DatabaseManager', { error });
      this.dependencies.metricsManager?.incrementCounter('database_uncaught_exceptions_total');
    });
  }

  private setupMetrics(): void {
    // Comprehensive database operation metrics
    this.dependencies.metricsManager?.createCounter('database_connections_total', 'Total number of database connections', ['type', 'status']);
    this.dependencies.metricsManager?.createCounter('database_operations_total', 'Total number of database operations', ['type', 'operation']);
    this.dependencies.metricsManager?.createHistogram('database_operation_duration_seconds', 'Duration of database operations', ['type', 'operation']);
    this.dependencies.metricsManager?.createGauge('database_active_connections', 'Number of active database connections', ['type']);
    this.dependencies.metricsManager?.createCounter('database_errors_total', 'Total number of database errors', ['type', 'error']);
    this.dependencies.metricsManager?.createCounter('database_queries_total', 'Total number of database queries', ['type', 'status']);
    this.dependencies.metricsManager?.createHistogram('database_query_duration_seconds', 'Duration of database queries', ['type', 'status']);
    this.dependencies.metricsManager?.createGauge('database_connection_status', 'Database connection status');
    this.dependencies.metricsManager?.createGauge('database_connection_retries', 'Number of connection retries');
    this.dependencies.metricsManager?.createCounter('database_unhandled_rejections_total', 'Total unhandled rejections');
    this.dependencies.metricsManager?.createCounter('database_uncaught_exceptions_total', 'Total uncaught exceptions');
  }

  private setupClients(): void {
    try {
      // Initialize Prisma client
      if (this.config.primary.type === 'prisma') {
        this.prismaClient = new PrismaClient({
          datasources: {
            db: {
              url: this.config.primary.url
            }
          },
          log: [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'event' },
            { level: 'info', emit: 'event' },
            { level: 'warn', emit: 'event' }
          ]
        });

        // Attach Prisma event listeners for logging and metrics
        this.attachPrismaListeners();
      }

      // Initialize Sequelize client (optional)
      if (this.config.primary.type === 'sequelize' || this.config.secondary?.type === 'sequelize') {
        const sequelizeOptions: SequelizeOptions = {
          dialect: 'postgres', // Adjust based on your database type
          host: new URL(this.config.primary.url).hostname,
          port: parseInt(new URL(this.config.primary.url).port || '5432'),
          username: new URL(this.config.primary.url).username,
          password: new URL(this.config.primary.url).password,
          database: new URL(this.config.primary.url).pathname.replace('/', ''),
          pool: {
            max: this.config.primary.maxConnections,
            min: 0,
            acquire: this.config.primary.connectionTimeout,
          },
          logging: false // Disable default logging
        };

        this.sequelizeClient = new Sequelize(sequelizeOptions);
        this.attachSequelizeListeners();
      }
    } catch (error) {
      this.dependencies.loggingManager?.error('Failed to initialize database clients', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  private attachPrismaListeners(): void {
    this.prismaClient.$on('query', (event) => {
      this.dependencies.metricsManager?.incrementCounter('database_operations_total', { type: 'prisma', operation: 'query' });
      this.dependencies.loggingManager?.debug('Prisma Query', { query: event.query, params: event.params });
    });

    this.prismaClient.$on('error', (event) => {
      this.dependencies.metricsManager?.incrementCounter('database_errors_total', { type: 'prisma', error: 'query' });
      this.dependencies.loggingManager?.error('Prisma Error', { error: event });
    });
  }

  private attachSequelizeListeners(): void {
    this.sequelizeClient.addListener('query', (sql) => {
      this.dependencies.metricsManager?.incrementCounter('database_operations_total', { type: 'sequelize', operation: 'query' });
      this.dependencies.loggingManager?.debug('Sequelize Query', { query: sql });
    });

    this.sequelizeClient.addListener('error', (error) => {
      this.dependencies.metricsManager?.incrementCounter('database_errors_total', { type: 'sequelize', error: 'connection' });
      this.dependencies.loggingManager?.error('Sequelize Error', { error });
    });
  }

  public async init(): Promise<void> {
    try {
      // Test database connections
      await this.testConnections();

      this.dependencies.loggingManager?.info('Database manager initialized successfully', {
        primaryType: this.config.primary.type,
        secondaryType: this.config.secondary?.type
      });
    } catch (error) {
      this.dependencies.loggingManager?.error('Failed to initialize Database manager', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  private async testConnections(): Promise<void> {
    try {
      // Test Prisma connection
      if (this.prismaClient) {
        await this.prismaClient.$connect();
        this.dependencies.metricsManager?.incrementCounter('database_connections_total', { type: 'prisma', status: 'success' });
      }

      // Test Sequelize connection
      if (this.sequelizeClient) {
        await this.sequelizeClient.authenticate();
        this.dependencies.metricsManager?.incrementCounter('database_connections_total', { type: 'sequelize', status: 'success' });
      }
    } catch (error) {
      this.dependencies.metricsManager?.incrementCounter('database_connections_total', { 
        type: this.config.primary.type, 
        status: 'failed' 
      });
      this.dependencies.loggingManager?.error('Database connection test failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      // Disconnect Prisma client
      if (this.prismaClient) {
        await this.prismaClient.$disconnect();
      }

      // Close Sequelize connection
      if (this.sequelizeClient) {
        await this.sequelizeClient.close();
      }

      this.dependencies.loggingManager?.info('Database manager cleaned up successfully');
    } catch (error) {
      this.dependencies.loggingManager?.error('Error during Database manager cleanup', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  public async getHealth(): Promise<{ status: 'healthy' | 'unhealthy' | 'degraded'; details?: Record<string, unknown>; }> {
    try {
      const connectionTests = [];

      // Test Prisma connection
      if (this.prismaClient) {
        connectionTests.push(
          this.prismaClient.$connect()
            .then(() => ({ type: 'prisma', status: 'healthy' }))
            .catch((error) => ({ type: 'prisma', status: 'unhealthy', error }))
        );
      }

      // Test Sequelize connection
      if (this.sequelizeClient) {
        connectionTests.push(
          this.sequelizeClient.authenticate()
            .then(() => ({ type: 'sequelize', status: 'healthy' }))
            .catch((error) => ({ type: 'sequelize', status: 'unhealthy', error }))
        );
      }

      const connectionResults = await Promise.allSettled(connectionTests);

      const unhealthyConnections = connectionResults.filter(
        result => result.status === 'rejected' || 
        (result.status === 'fulfilled' && result.value.status === 'unhealthy')
      );

      return {
        status: unhealthyConnections.length > 0 
          ? (unhealthyConnections.length === connectionTests.length ? 'unhealthy' : 'degraded')
          : 'healthy',
        details: {
          connections: connectionResults.map(result => 
            result.status === 'fulfilled' ? result.value : { status: 'unknown', error: result.reason }
          )
        }
      };
    } catch (error) {
      this.dependencies.loggingManager?.error('Database manager health check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  public async transaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
    options?: z.infer<typeof TransactionOptionsSchema>
  ): Promise<T> {
    const startTime = Date.now();
    const validatedOptions = TransactionOptionsSchema.parse(options || {});
    let attempts = 0;

    while (attempts < validatedOptions.maxAttempts) {
      try {
        const result = await this.prismaClient.$transaction(
          async (prisma) => fn(prisma),
          { 
            timeout: validatedOptions.timeout 
          }
        );

        this.dependencies.metricsManager?.observeHistogram(
          'database_query_duration_seconds',
          (Date.now() - startTime) / 1000,
          { 
            type: 'transaction',
            status: 'success'
          }
        );

        return result;
      } catch (error) {
        attempts++;
        
        this.dependencies.metricsManager?.incrementCounter('database_errors_total', { 
          type: 'transaction',
          code: error instanceof Error ? error.name : 'unknown'
        });

        if (attempts === validatedOptions.maxAttempts) {
          this.dependencies.loggingManager?.error('Transaction failed', {
            error,
            attempts,
            duration: Date.now() - startTime
          });
          
          this.dependencies.metricsManager?.observeHistogram(
            'database_query_duration_seconds',
            (Date.now() - startTime) / 1000,
            { 
              type: 'transaction',
              status: 'failure'
            }
          );
          
          throw error;
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          1000 * Math.pow(2, attempts) + Math.random() * 1000, 
          validatedOptions.timeout
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Unexpected transaction failure');
  }

  // Expose database clients for advanced use cases
  public getPrismaClient(): PrismaClient | null {
    return this.prismaClient || null;
  }

  public getSequelizeClient(): Sequelize | null {
    return this.sequelizeClient || null;
  }

  // Event-driven database operations
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public emit(event: string, ...args: any[]): void {
    this.eventEmitter.emit(event, ...args);
  }
}
