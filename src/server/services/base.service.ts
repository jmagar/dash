import { EventEmitter } from 'events';
import { Client as SSHClient } from 'ssh2';
import { logger } from '../utils/logger';
import { metrics, recordHostMetric } from '../metrics';
import cache from '../cache';
import { errorAggregator } from './errorAggregator';
import type { Host } from '../../types/host';
import type { LogMetadata } from '../../types/logger';
import type { ICacheService } from '../cache/types';
import type { Container, Stack } from '../../types/models-shared';
import type { CacheCommand } from '../../types/cache';

interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
  timeout?: number;
}

const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  factor: 2,
};

interface SSHOptions {
  timeout?: number;
  keepaliveInterval?: number;
  readyTimeout?: number;
}

export abstract class BaseService extends EventEmitter {
  protected readonly logger = logger;
  protected readonly metrics = metrics;
  protected readonly cache: ICacheService = cache;

  /**
   * Execute an operation with an SSH connection
   */
  protected async withSSH<T>(
    host: Host,
    operation: (ssh: SSHClient) => Promise<T>,
    options: SSHOptions = {}
  ): Promise<T> {
    const ssh = new SSHClient();
    const startTime = Date.now();
    const metadata: LogMetadata = {
      hostId: host.id,
      hostname: host.hostname,
    };

    try {
      await new Promise<void>((resolve, reject) => {
        ssh
          .on('ready', () => {
            this.logger.debug('SSH connection established', metadata);
            resolve();
          })
          .on('error', (err) => {
            this.logger.error('SSH connection error', {
              ...metadata,
              error: err.message,
            });
            reject(err);
          })
          .connect({
            host: host.hostname,
            port: host.port,
            username: host.username,
            password: host.password,
            privateKey: host.privateKey,
            passphrase: host.passphrase,
            keepaliveInterval: options.keepaliveInterval || 10000,
            readyTimeout: options.readyTimeout || 20000,
          });
      });

      const result = await operation(ssh);
      const duration = Date.now() - startTime;

      recordHostMetric(host.id, 'ssh_operation_duration', duration);
      this.logger.debug('SSH operation completed', {
        ...metadata,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      recordHostMetric(host.id, 'ssh_operation_error', 1);
      this.logger.error('SSH operation failed', {
        ...metadata,
        error: errorMessage,
        duration,
      });

      errorAggregator.trackError(
        error instanceof Error ? error : new Error(errorMessage),
        metadata
      );

      throw error;
    } finally {
      ssh.end();
    }
  }

  /**
   * Execute an operation with retry logic
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const retryOptions = { ...defaultRetryOptions, ...options };
    let attempt = 0;
    let delay = retryOptions.initialDelay;

    while (attempt < retryOptions.maxAttempts) {
      try {
        if (attempt > 0) {
          this.logger.debug('Retrying operation', {
            attempt,
            delay,
          });
        }

        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => {
            if (retryOptions.timeout) {
              setTimeout(() => reject(new Error('Operation timed out')), retryOptions.timeout);
            }
          }),
        ]);

        return result;
      } catch (error) {
        attempt++;
        if (attempt === retryOptions.maxAttempts) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * retryOptions.factor, retryOptions.maxDelay);
      }
    }

    throw new Error('Retry attempts exhausted');
  }

  /**
   * Handle and log errors consistently
   */
  protected handleError(error: unknown, context: Record<string, unknown> = {}): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const metadata: LogMetadata = {
      ...context,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    };

    this.logger.error('Operation failed', metadata);
    errorAggregator.trackError(
      error instanceof Error ? error : new Error(errorMessage),
      metadata
    );

    throw error;
  }

  /**
   * Cache host data with consistent error handling
   */
  protected async withHostCache(
    hostId: string,
    operation: () => Promise<string>
  ): Promise<string | null> {
    try {
      const cached = await this.cache.getHost(hostId);
      if (cached) {
        return cached;
      }

      const result = await operation();
      await this.cache.setHost(hostId, result);
      return result;
    } catch (error) {
      this.handleError(error, { hostId });
    }
  }

  /**
   * Cache container data with consistent error handling
   */
  protected async withContainerCache(
    hostId: string,
    operation: () => Promise<Container[]>
  ): Promise<Container[] | null> {
    try {
      const cached = await this.cache.getContainers(hostId);
      if (cached) {
        return cached;
      }

      const result = await operation();
      await this.cache.setContainers(hostId, result);
      return result;
    } catch (error) {
      this.handleError(error, { hostId });
    }
  }

  /**
   * Cache stack data with consistent error handling
   */
  protected async withStackCache(
    hostId: string,
    operation: () => Promise<Stack[]>
  ): Promise<Stack[] | null> {
    try {
      const cached = await this.cache.getStacks(hostId);
      if (cached) {
        return cached;
      }

      const result = await operation();
      await this.cache.setStacks(hostId, result);
      return result;
    } catch (error) {
      this.handleError(error, { hostId });
    }
  }

  /**
   * Record metrics with consistent error handling
   */
  protected recordMetric(
    hostId: string,
    metricType: string,
    value: number,
    tags: Record<string, string | number> = {}
  ): void {
    try {
      recordHostMetric(hostId, metricType, value);
    } catch (error) {
      this.logger.error('Failed to record metric', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        metricType,
        value,
        tags,
      });
    }
  }

  /**
   * Clean up resources
   */
  public abstract cleanup(): Promise<void>;
}
