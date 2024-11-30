import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import type {
  HealthStatus,
  ServiceStatus,
  MetricValue,
  BaseMetric,
  HealthMetricOptions,
  HealthCheckResult
} from '../../../types/health';

export class HealthMetrics {
  @ApiProperty({ description: 'CPU usage percentage', minimum: 0, maximum: 100 })
  @IsNumber()
  @IsOptional()
  cpuUsage?: number;

  @ApiProperty({ description: 'Memory usage in megabytes', minimum: 0 })
  @IsNumber()
  @IsOptional()
  memoryUsage?: number;

  @ApiProperty({ description: 'Disk usage percentage', minimum: 0, maximum: 100 })
  @IsNumber()
  @IsOptional()
  diskUsage?: number;

  @ApiProperty({ description: 'Network latency in milliseconds', minimum: 0 })
  @IsNumber()
  @IsOptional()
  networkLatency?: number;

  @ApiProperty({ description: 'Additional custom metrics' })
  @IsObject()
  @IsOptional()
  customMetrics?: Record<string, MetricValue>;

  constructor(partial?: Partial<HealthMetrics>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class BaseHealthDto implements HealthCheckResult {
  @ApiProperty({ description: 'Overall health status', enum: ['healthy', 'unhealthy', 'degraded'] })
  @IsString()
  @IsNotEmpty()
  status!: HealthStatus;

  @ApiProperty({ description: 'System uptime in seconds', minimum: 0 })
  @IsNumber()
  @IsNotEmpty()
  uptime!: number;

  @ApiProperty({ description: 'System version' })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiProperty({ description: 'Health check timestamp' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  timestamp!: Date;

  @ApiProperty({ description: 'Detailed health metrics' })
  @ValidateNested()
  @Type(() => HealthMetrics)
  @IsOptional()
  metrics?: HealthMetrics;

  @ApiProperty({ description: 'Additional health metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: 'Optional health check message' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ description: 'Health check duration in milliseconds' })
  @IsNumber()
  @IsOptional()
  duration?: number;

  constructor(partial?: Partial<BaseHealthDto>) {
    if (partial) {
      const { metrics, timestamp, metadata, ...rest } = partial;
      Object.assign(this, {
        ...rest,
        metrics: metrics ? new HealthMetrics(metrics) : undefined,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        metadata: metadata === null ? undefined : metadata,
        status: rest.status || 'healthy'
      });
    } else {
      this.timestamp = new Date();
      this.status = 'healthy';
    }
  }

  /**
   * Checks if the health metrics exceed any configured thresholds
   */
  public hasThresholdExceeded(): boolean {
    if (!this.metrics) return false;

    const { cpuUsage, memoryUsage, diskUsage, networkLatency } = this.metrics;
    return (
      (cpuUsage !== undefined && cpuUsage > 80) ||
      (memoryUsage !== undefined && memoryUsage > 85) ||
      (diskUsage !== undefined && diskUsage > 90) ||
      (networkLatency !== undefined && networkLatency > 1000)
    );
  }

  /**
   * Updates the health status based on metrics and dependencies
   */
  public updateStatus(): void {
    if (this.hasThresholdExceeded()) {
      this.status = 'degraded';
      return;
    }

    // Add additional status update logic here
    this.status = 'healthy';
  }
}
