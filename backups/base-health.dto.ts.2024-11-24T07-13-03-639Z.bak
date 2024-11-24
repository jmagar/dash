import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class HealthMetrics {
  @ApiProperty({ description: 'Current memory usage in MB' })
  @IsNumber()
  memoryUsage: number;

  @ApiProperty({ description: 'CPU usage percentage' })
  @IsNumber()
  cpuUsage: number;

  @ApiProperty({ description: 'Disk usage percentage' })
  @IsNumber()
  diskUsage: number;

  constructor(partial: Partial<HealthMetrics>) {
    Object.assign(this, partial);
  }
}

export class BaseHealthDto {
  @ApiProperty({ description: 'Service is healthy and operational' })
  @IsBoolean()
  isHealthy: boolean;

  @ApiProperty({ description: 'Uptime in seconds' })
  @IsNumber()
  uptime: number;

  @ApiProperty({ description: 'Version of the service' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Health check timestamp' })
  @IsString()
  timestamp: string = new Date().toISOString();

  @ApiProperty({ description: 'System metrics', type: HealthMetrics })
  @Type(() => HealthMetrics)
  @IsObject()
  metrics: HealthMetrics;

  @ApiProperty({ description: 'Additional health information', required: false })
  @IsObject()
  @IsOptional()
  details?: Record<string, any>;

  constructor(partial: Partial<BaseHealthDto>) {
    Object.assign(this, partial);
    if (partial.metrics) {
      this.metrics = new HealthMetrics(partial.metrics);
    }
  }
}
