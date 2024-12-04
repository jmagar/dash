import { Injectable } from '@nestjs/common';
import { Logger } from '../../utils/logger';
import { MetricsService } from '../../utils/metrics';

export interface FileSystemMetric {
  operation: string;
  type: string;
  duration?: number;
  size?: number;
}

@Injectable()
export class FileSystemMetricsService {
  constructor(
    private readonly metrics: MetricsService,
    private readonly logger: Logger
  ) {
    this.initializeMetrics();
  }

  /**
   * Initialize filesystem-specific metrics
   */
  private initializeMetrics(): void {
    try {
      // Total filesystem operations counter
      this.metrics.createCounter('filesystem_operations_total', 
        'Total number of filesystem operations', 
        ['operation', 'type']
      );

      // Filesystem errors counter
      this.metrics.createCounter('filesystem_errors_total', 
        'Total number of filesystem errors', 
        ['operation', 'type']
      );

      // Operation duration histogram
      this.metrics.createHistogram('filesystem_operation_duration_seconds', 
        'Duration of filesystem operations', 
        ['operation', 'type']
      );

      // File size tracking
      this.metrics.createGauge('filesystem_file_size_bytes', 
        'Size of files processed', 
        ['operation', 'type']
      );

      // Storage usage metrics
      this.metrics.createGauge('filesystem_storage_used_bytes', 
        'Storage space used in bytes'
      );

      this.metrics.createGauge('filesystem_storage_available_bytes', 
        'Storage space available in bytes'
      );
    } catch (error) {
      this.logger.error('Failed to initialize filesystem metrics', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Record a filesystem operation metric
   */
  public recordOperation(metric: FileSystemMetric): void {
    try {
      // Record operation count
      this.metrics.counter('filesystem_operations_total')?.inc({
        operation: metric.operation,
        type: metric.type
      });

      // Record operation duration if available
      if (metric.duration !== undefined) {
        this.metrics.histogram('filesystem_operation_duration_seconds')?.observe(
          { operation: metric.operation, type: metric.type },
          metric.duration
        );
      }

      // Record file size if available
      if (metric.size !== undefined) {
        this.metrics.gauge('filesystem_file_size_bytes')?.set(
          { operation: metric.operation, type: metric.type },
          metric.size
        );
      }
    } catch (error) {
      this.logger.warn('Failed to record filesystem metric', { 
        metric, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Record a filesystem error
   */
  public recordError(operation: string, type: string, error?: Error): void {
    try {
      this.metrics.counter('filesystem_errors_total')?.inc({
        operation,
        type: type || (error ? 'system' : 'unknown')
      });

      // Log the error details
      if (error) {
        this.logger.error(`Filesystem operation error: ${operation}`, {
          error: error.message,
          stack: error.stack
        });
      }
    } catch (metricsError) {
      this.logger.warn('Failed to record filesystem error metric', { 
        operation, 
        type,
        error: metricsError instanceof Error ? metricsError.message : 'Unknown error'
      });
    }
  }

  /**
   * Track storage usage
   */
  public trackStorageUsage(usedBytes: number, availableBytes: number): void {
    try {
      this.metrics.gauge('filesystem_storage_used_bytes')?.set(usedBytes);
      this.metrics.gauge('filesystem_storage_available_bytes')?.set(availableBytes);
    } catch (error) {
      this.logger.warn('Failed to track storage usage', { 
        usedBytes, 
        availableBytes, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}
