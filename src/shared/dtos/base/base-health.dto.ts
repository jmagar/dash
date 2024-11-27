import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class HealthMetrics {
  @ApiProperty({ description: 'CPU usage percentage' })
  @IsNumber()
  @IsOptional()
  cpuUsage?: number;

  @ApiProperty({ description: 'Memory usage in bytes' })
  @IsNumber()
  @IsOptional()
  memoryUsage?: number;

  @ApiProperty({ description: 'Disk usage in bytes' })
  @IsNumber()
  @IsOptional()
  diskUsage?: number;

  @ApiProperty({ description: 'Network latency in milliseconds' })
  @IsNumber()
  @IsOptional()
  networkLatency?: number;

  @ApiProperty({ description: 'Additional custom metrics' })
  @IsObject()
  @IsOptional()
  customMetrics?: Record<string, any> = {};

  constructor(partial?: Partial<HealthMetrics>) {
    Object.assign(this, partial);
  }
}

export class BaseHealthDto {
  @ApiProperty({ description: 'Overall health status' })
  @IsBoolean()
  @IsNotEmpty()
  isHealthy!: boolean;

  @ApiProperty({ description: 'System uptime in seconds' })
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
  metadata?: Record<string, any>;

  constructor(partial?: Partial<BaseHealthDto>) {
    if (partial) {
      const { metrics, timestamp, metadata, ...rest } = partial;
      Object.assign(this, {
        ...rest,
        metrics: metrics ? new HealthMetrics(metrics) : undefined,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        metadata: metadata === null ? undefined : metadata
      });
    } else {
      this.timestamp = new Date();
    }
  }
}
