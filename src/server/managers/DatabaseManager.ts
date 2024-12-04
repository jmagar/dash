import { z } from 'zod';
import { BaseService } from '../services/base.service';
import { PrismaClient } from '@prisma/client';
import { ConfigManager } from './ConfigManager';
import { MetricsManager } from './MetricsManager';
import { LoggingManager } from './LoggingManager';

// Zod Schemas for Configuration
const DatabaseConfigSchema = z.object({
  url: z.string().url('Invalid database connection URL'),
  maxConnections: z.number().int().min(1).max(100).default(10),
  connectionTimeout: z.number().int().min(1000).max(60000).default(5000),
  idleTimeout: z.number().int().min(1000).max(60000).default(10000),
  maxRetries: z.number().int().min(0).max(10).default(5),
  retryDelay: z.number().int().min(100).max(30000).default(5000),
  logQueries: z.boolean().default(false),
  logLevel: z.enum(['error', 'warn', 'info', 'query']).default('error')
}).strict();

// Transaction Options Schema
const TransactionOptionsSchema = z.object({
  timeout: z.number().int().min(1000).max(300000).optional().default(30000),
  maxAttempts: z.number().int().min(1).max(10).optional().default(3)
}).strict();

export class DatabaseManager extends BaseService {
  private static instance: DatabaseManager;
  private prisma: PrismaClient;
  private configManager: ConfigManager;
  private logger: LoggingManager;
  private metrics: MetricsManager;

  private isConnected: boolean = false;
  private connectionRetries: number = 0;
  private databaseConfig: z.infer<typeof DatabaseConfigSchema>;

  private constructor(
    configManager: ConfigManager,
    logger: LoggingManager,
    metrics: MetricsManager
  ) {
    super({
      name: 'database-manager',
      version: '1.0.0'
    });

    this.configManager = configManager;
    this.logger = logger;
    this.metrics = metrics;

    // Load and validate database configuration
    this.databaseConfig = DatabaseConfigSchema.parse(
      this.configManager.get('database', {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/mydb',
        maxConnections: 10,
        connectionTimeout: 5000,
        idleTimeout: 10000,
        maxRetries: 5,
        retryDelay: 5000,
        logQueries: false,
        logLevel: 'error'
      })
    );

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.databaseConfig.url
        }
      },
      log: [
        { emit: 'event', level: this.databaseConfig.logLevel }
      ],
      errorFormat: 'pretty'
    });

    this.setupMetrics();
    this.setupPrismaListeners();
    this.setupErrorHandling();
  }

  public static getInstance(
    configManager: ConfigManager,
    logger: LoggingManager,
    metrics: MetricsManager
  ): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(
        configManager, 
        logger, 
        metrics
      );
    }
    return DatabaseManager.instance;
  }

  private setupErrorHandling(): void {
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection in DatabaseManager', { 
        reason, 
        promise 
      });
      this.metrics.incrementCounter('database_unhandled_rejections_total');
    });

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception in DatabaseManager', { error });
      this.metrics.incrementCounter('database_uncaught_exceptions_total');
    });
  }

  private setupMetrics(): void {
    // Enhanced metrics with more detailed tracking
    this.metrics.createCounter('database_queries_total', 'Total number of database queries', ['type', 'status']);
    this.metrics.createCounter('database_errors_total', 'Total number of database errors', ['type', 'code']);
    this.metrics.createHistogram('database_query_duration_seconds', 'Duration of database queries', ['type', 'status']);
    this.metrics.createGauge('database_connection_status', 'Database connection status');
    this.metrics.createGauge('database_connection_retries', 'Number of connection retries');
    this.metrics.createCounter('database_unhandled_rejections_total', 'Total unhandled rejections');
    this.metrics.createCounter('database_uncaught_exceptions_total', 'Total uncaught exceptions');
  }

  private setupPrismaListeners(): void {
    // @ts-ignore - Prisma events are not properly typed
    this.prisma.$on('query', (e: any) => {
      const duration = e.duration / 1000; // Convert to seconds
      const queryType = e.query.toLowerCase().split(' ')[0];
      
      this.metrics.incrementCounter('database_queries_total', { 
        type: queryType, 
        status: 'success' 
      });
      
      this.metrics.observeHistogram('database_query_duration_seconds', duration, { 
        type: queryType,
        status: 'success'
      });

      if (this.databaseConfig.logQueries) {
        this.logger.info('Database Query', { 
          query: e.query, 
          duration: e.duration 
        });
      }
    });

    // @ts-ignore - Prisma events are not properly typed
    this.prisma.$on('error', (e: any) => {
      this.metrics.incrementCounter('database_errors_total', { 
        type: e.target || 'unknown',
        code: e.code || 'unknown'
      });
      
      this.logger.error('Database Error', { 
        error: e,
        target: e.target,
        code: e.code
      });
    });
  }

  public async init(): Promise<void> {
    try {
      await this.connect();
      this.logger.info('Database manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database manager', { error });
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      await this.disconnect();
      this.logger.info('Database manager cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during database manager cleanup', { error });
      throw error;
    }
  }

  public async getHealth(): Promise<{ 
    status: 'healthy' | 'unhealthy' | 'degraded'; 
    details?: Record<string, unknown>; 
  }> {
    try {
      if (!this.isConnected) {
        return {
          status: 'unhealthy',
          details: {
            connection: false,
            retries: this.connectionRetries,
            config: {
              url: this.databaseConfig.url.replace(/\/\/.*:.*@/, '//[REDACTED]@')
            }
          }
        };
      }

      // Test database connection with a simple query
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const queryDuration = Date.now() - startTime;

      return {
        status: queryDuration > 1000 ? 'degraded' : 'healthy',
        details: {
          connection: true,
          retries: this.connectionRetries,
          queryDuration,
          config: {
            url: this.databaseConfig.url.replace(/\/\/.*:.*@/, '//[REDACTED]@')
          }
        }
      };
    } catch (error) {
      this.logger.error('Database health check failed', { error });
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          connection: false,
          retries: this.connectionRetries,
          config: {
            url: this.databaseConfig.url.replace(/\/\/.*:.*@/, '//[REDACTED]@')
          }
        }
      };
    }
  }

  private async connect(): Promise<void> {
    while (this.connectionRetries < this.databaseConfig.maxRetries) {
      try {
        const startTime = Date.now();
        await this.prisma.$connect();
        
        const connectionTime = Date.now() - startTime;
        this.isConnected = true;
        
        this.metrics.setGauge('database_connection_status', 1);
        this.metrics.setGauge('database_connection_retries', this.connectionRetries);
        
        this.logger.info('Successfully connected to database', { 
          connectionTime,
          retries: this.connectionRetries 
        });
        
        return;
      } catch (error) {
        this.connectionRetries++;
        
        this.metrics.setGauge('database_connection_status', 0);
        this.metrics.setGauge('database_connection_retries', this.connectionRetries);
        
        this.logger.error('Failed to connect to database', {
          error,
          retry: this.connectionRetries,
          maxRetries: this.databaseConfig.maxRetries
        });

        if (this.connectionRetries < this.databaseConfig.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.databaseConfig.retryDelay));
        }
      }
    }

    throw new Error(`Failed to connect to database after ${this.databaseConfig.maxRetries} attempts`);
  }

  private async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      
      this.metrics.setGauge('database_connection_status', 0);
      this.logger.info('Successfully disconnected from database');
    } catch (error) {
      this.logger.error('Error disconnecting from database', { error });
      throw error;
    }
  }

  public getPrisma(): PrismaClient {
    if (!this.isConnected) {
      throw new Error('Database is not connected');
    }
    return this.prisma;
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
        const result = await this.prisma.$transaction(
          async (prisma) => fn(prisma),
          { 
            timeout: validatedOptions.timeout 
          }
        );

        this.metrics.observeHistogram(
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
        
        this.metrics.incrementCounter('database_errors_total', { 
          type: 'transaction',
          code: error instanceof Error ? error.name : 'unknown'
        });

        if (attempts === validatedOptions.maxAttempts) {
          this.logger.error('Transaction failed', {
            error,
            attempts,
            duration: Date.now() - startTime
          });
          
          this.metrics.observeHistogram(
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
}
