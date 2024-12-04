import { EventEmitter } from 'events';
import { BaseService, type ServiceConfig } from '../../services/base.service';
import { LoggingManager, LogMetadata } from '../LoggingManager';

import {
  IManager,
  ManagerName,
  ManagerEvent,
  ManagerHealth,
  ManagerError,
  ManagerOperationResult,
  BaseManagerConfig,
  BaseManagerConfigSchema,
  isManagerError,
  isManagerEvent
} from '../types/manager.types';

// Type guard for LoggingManager methods
function isValidLogger(logger: unknown): logger is LoggingManager {
  return logger !== null && 
         typeof logger === 'object' && 
         typeof (logger as LoggingManager).error === 'function' &&
         typeof (logger as LoggingManager).warn === 'function' &&
         typeof (logger as LoggingManager).info === 'function' &&
         typeof (logger as LoggingManager).debug === 'function';
}

export class BaseManager<T extends BaseManagerConfig = BaseManagerConfig> 
  implements IManager {

  protected readonly events: EventEmitter;
  protected readonly logger: LoggingManager;
  protected readonly service: BaseService;
  private readonly startTime: number;
  private readonly config: T;

  constructor(
    config: T, 
    logger: LoggingManager
  ) {
    // Validate that the logger is valid
    if (!isValidLogger(logger)) {
      throw new Error('Invalid logger provided');
    }

    // Validate config using Zod schema
    const parsedConfig = BaseManagerConfigSchema.safeParse(config);
    
    if (!parsedConfig.success) {
      throw new Error(`Invalid manager configuration: ${parsedConfig.error.message}`);
    }

    // Create a type-safe validated configuration
    const validatedConfig = parsedConfig.data;

    // Check if validatedConfig is assignable to T
    if (!isBaseManagerConfig<T>(validatedConfig)) {
      throw new Error('Invalid manager configuration: validated config is not assignable to T');
    }

    this.config = validatedConfig;
    this.logger = logger;
    this.service = new BaseService({
      retryOptions: validatedConfig.retryOptions 
        ? {
            ...validatedConfig.retryOptions,
            factor: validatedConfig.retryOptions.factor ?? 2,
            maxAttempts: validatedConfig.retryOptions.maxAttempts ?? 3,
            initialDelay: validatedConfig.retryOptions.initialDelay ?? 1000,
            maxDelay: validatedConfig.retryOptions.maxDelay ?? 10000
          }
        : undefined,
      metricsEnabled: validatedConfig.metrics ?? true,
      loggingEnabled: validatedConfig.logging ?? true
    });
    this.events = new EventEmitter();
    this.startTime = Date.now();

    // Set up error handling for the event emitter
    this.events.on('error', this.handleEventError.bind(this));
  }

  // Explicit error handling for event errors
  private handleEventError(error: Error): void {
    if (isValidLogger(this.logger)) {
      this.logger.error('Unhandled event error', { 
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name
      } as LogMetadata);
    }
  }

  // IManager implementation methods with explicit return types
  public getName(): ManagerName {
    return this.config.name as ManagerName;
  }

  public getVersion(): string {
    return this.config.version ?? '0.0.0';
  }

  public async getHealth(): Promise<ManagerHealth> {
    const uptime = Date.now() - this.startTime;
    return Promise.resolve({
      status: 'healthy',
      timestamp: new Date(),
      details: {
        uptime,
        version: this.getVersion()
      }
    });
  }

  // Strongly typed event methods
  public on(event: string, listener: (data: ManagerEvent) => void): void {
    this.events.on(event, (data: unknown) => {
      if (isManagerEvent(data)) {
        listener(data);
      } else if (isValidLogger(this.logger)) {
        this.logger.warn('Invalid event data received', { 
          event, 
          data: data ? JSON.stringify(data) : 'undefined',
          context: 'event_validation'
        } as LogMetadata);
      }
    });
  }

  public emit(event: string, data: ManagerEvent): boolean {
    return this.events.emit(event, data);
  }

  // Improved operation metrics with type safety
  protected recordOperationMetrics<TResult, E extends ManagerError = ManagerError>(
    operationName: string, 
    result: ManagerOperationResult<TResult, E>
  ): void {
    const { success, metadata } = result;
    
    if (isValidLogger(this.logger)) {
      // Log operation metrics
      this.logger.info(`Operation ${operationName}`, {
        success,
        duration: metadata.duration,
        timestamp: metadata.timestamp.toISOString(),
        context: 'operation_metrics'
      } as LogMetadata);

      // Potential additional metrics tracking
      if (!success && result.error && isManagerError(result.error)) {
        this.logger.error(`Operation ${operationName} failed`, { 
          errorMessage: result.error.message,
          errorCode: result.error.code,
          context: 'operation_error',
          error: result.error
        } as LogMetadata);
      }
    }
  }

  // Generic method for safe configuration retrieval
  protected getConfigValue<V>(
    key: keyof T, 
    defaultValue?: V
  ): V | undefined {
    try {
      const value = this.config[key];
      return value as V ?? defaultValue;
    } catch (error) {
      if (isValidLogger(this.logger)) {
        this.logger.warn(`Error retrieving config value for ${String(key)}`, { 
          errorMessage: error instanceof Error ? error.message : String(error),
          context: 'config_retrieval',
          error: error instanceof Error ? error : undefined
        } as LogMetadata);
      }
      return defaultValue;
    }
  }

  // Enhanced operation execution with comprehensive error handling
  protected async executeOperation<TResult, TError extends ManagerError = ManagerError>(
    operation: string,
    executor: () => Promise<TResult>
  ): Promise<ManagerOperationResult<TResult, TError>> {
    const startTime = Date.now();
    const source = this.getName();

    try {
      // Execute the operation with retry
      const data = await executor();

      const duration = Date.now() - startTime;

      // Emit success event
      this.emit('operation', {
        type: 'operation_success',
        timestamp: new Date(),
        data: { operation, duration, source }
      });

      // Track metrics if enabled
      if (this.config.metrics) {
        this.recordOperationMetrics(operation, {
          success: true,
          data,
          metadata: {
            timestamp: new Date(),
            duration,
            source
          }
        });
      }

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date(),
          duration,
          source
        }
      } as ManagerOperationResult<TResult, TError>;
    } catch (error) {
      const duration = Date.now() - startTime;
      const typedError = isManagerError(error) 
        ? error as TError 
        : { 
            message: error instanceof Error ? error.message : String(error),
            code: 'UNKNOWN_ERROR'
          } as TError;

      // Emit error event
      this.emit('operation', {
        type: 'operation_error',
        timestamp: new Date(),
        data: { operation, error: typedError, duration, source }
      });

      // Track metrics if enabled
      if (this.config.metrics) {
        this.recordOperationMetrics(operation, {
          success: false,
          error: typedError,
          metadata: {
            timestamp: new Date(),
            duration,
            source
          }
        });
      }

      // Log error if logging is enabled
      if (this.config.logging && isValidLogger(this.logger)) {
        this.logger.error('Operation failed', {
          operation,
          errorMessage: typedError.message,
          errorCode: typedError.code,
          duration,
          source
        } as LogMetadata);
      }

      return {
        success: false,
        error: typedError,
        metadata: {
          timestamp: new Date(),
          duration,
          source
        }
      } as ManagerOperationResult<TResult, TError>;
    }
  }
}

// Type guard for BaseManagerConfig
function isBaseManagerConfig<T>(config: unknown): config is T {
  return config !== null && 
         typeof config === 'object' && 
         'name' in config && 
         'version' in config && 
         'retryOptions' in config && 
         'metrics' in config && 
         'logging' in config;
}

export default BaseManager;
