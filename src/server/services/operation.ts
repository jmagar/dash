import { EventEmitter } from 'events';
import type { 
  ServiceResult, 
  ServiceOptions, 
  ServiceContext,
  ServiceEvent
} from '../../types/service';
import { ServiceEventType } from '../../types/service';
import type { Host } from '../../types/host';
import type { Logger, LogMetadata } from '../../types/logger';
import { LoggingManager } from '../managers/LoggingManager';
import { LoggerAdapter } from '../utils/logging/logger.adapter';
import { metrics } from '../metrics';
import { errorAggregator } from './errorAggregator';
import { v4 as uuidv4 } from 'uuid';

export class ServiceOperationExecutor<T> extends EventEmitter {
  private readonly logger: Logger;
  private context: ServiceContext;
  private operation: () => Promise<T>;
  private validator?: () => Promise<void>;
  private cleanupFn?: () => Promise<void>;

  constructor(operation: () => Promise<T>, options: ServiceOptions = {}) {
    super();
    this.logger = new LoggerAdapter(LoggingManager.getInstance(), {
      component: 'ServiceOperationExecutor'
    });
    this.operation = operation;
    this.context = {
      operationId: uuidv4(),
      startTime: Date.now(),
      metadata: {},
      options
    };
  }

  async execute(): Promise<ServiceResult<T>> {
    try {
      // Run validation if provided
      if (this.validator) {
        await this.validator();
      }

      // Execute operation with retry if configured
      const result = await this.executeWithRetry();

      // Calculate duration
      const duration = Date.now() - this.context.startTime;

      // Record metrics
      if (this.context.options.metrics) {
        const { type = 'operation_duration', tags = {} } = this.context.options.metrics;
        metrics.gauge('operation_duration', duration, {
          ...tags,
          host_id: this.context.metadata.hostId as string,
          metric_type: type
        });
      }

      // Emit success event
      this.emit('success', {
        type: ServiceEventType.OPERATION_END,
        timestamp: new Date(),
        context: this.context,
        data: result,
        metadata: { duration }
      } as ServiceEvent<T>);

      return {
        data: result,
        metadata: this.context.metadata,
        duration
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const metadata: LogMetadata = {
        ...this.context.metadata,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - this.context.startTime
      };

      // Log error
      this.logger.error('Operation failed', metadata);

      // Track error
      errorAggregator.trackError(
        error instanceof Error ? error : new Error(errorMessage),
        metadata
      );

      // Emit error event
      this.emit('error', {
        type: ServiceEventType.OPERATION_ERROR,
        timestamp: new Date(),
        context: this.context,
        error: error instanceof Error ? error : new Error(errorMessage),
        metadata
      } as ServiceEvent<T>);

      throw error;

    } finally {
      // Run cleanup if provided
      if (this.cleanupFn) {
        try {
          await this.cleanupFn();
        } catch (error) {
          this.logger.error('Cleanup failed', {
            error: error instanceof Error ? error.message : String(error),
            ...this.context.metadata
          });
        }
      }
    }
  }

  private async executeWithRetry(): Promise<T> {
    const retryOptions = this.context.options.retry;
    if (!retryOptions) {
      return this.operation();
    }

    const {
      maxAttempts = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      factor = 2,
      timeout
    } = retryOptions;

    let attempt = 0;
    let delay = initialDelay;

    while (attempt < maxAttempts) {
      try {
        if (attempt > 0) {
          this.logger.debug('Retrying operation', {
            attempt,
            delay,
            ...this.context.metadata
          });
        }

        const result = await Promise.race([
          this.operation(),
          new Promise<never>((_, reject) => {
            if (timeout) {
              setTimeout(() => reject(new Error('Operation timed out')), timeout);
            }
          })
        ]);

        return result;

      } catch (error) {
        attempt++;
        if (attempt === maxAttempts) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * factor, maxDelay);
      }
    }

    throw new Error('Retry attempts exhausted');
  }

  withValidation(validator: () => Promise<void>): this {
    this.validator = validator;
    return this;
  }

  withCleanup(cleanup: () => Promise<void>): this {
    this.cleanupFn = cleanup;
    return this;
  }

  withMetadata(metadata: LogMetadata): this {
    this.context.metadata = { ...this.context.metadata, ...metadata };
    return this;
  }

  withHost(host: Host): this {
    this.context.metadata.hostId = host.id;
    this.context.metadata.hostname = host.hostname;
    return this;
  }
}
