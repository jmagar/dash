import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Disk usage metrics DTO
 */
export class DiskMetricsDto {
  @ApiProperty({ description: 'Disk mount point' })
  @IsString()
  mountPoint: string;

  @ApiProperty({ description: 'Used space percentage' })
  @IsNumber()
  usedPercent: number;

  @ApiProperty({ description: 'Total space in bytes' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Used space in bytes' })
  @IsNumber()
  used: number;

  @ApiProperty({ description: 'Free space in bytes' })
  @IsNumber()
  free: number;
}

/**
 * Memory usage metrics DTO
 */
export class MemoryMetricsDto {
  @ApiProperty({ description: 'Used memory percentage' })
  @IsNumber()
  usedPercent: number;

  @ApiProperty({ description: 'Total memory in bytes' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Used memory in bytes' })
  @IsNumber()
  used: number;

  @ApiProperty({ description: 'Free memory in bytes' })
  @IsNumber()
  free: number;

  @ApiPropertyOptional({ description: 'Swap usage in bytes' })
  @IsOptional()
  @IsNumber()
  swapUsed?: number;
}

/**
 * CPU metrics DTO
 */
export class CpuMetricsDto {
  @ApiProperty({ description: 'Number of CPU cores' })
  @IsNumber()
  cores: number;

  @ApiProperty({ description: 'CPU model name' })
  @IsString()
  model: string;

  @ApiProperty({ description: 'CPU speed in MHz' })
  @IsNumber()
  speed: number;

  @ApiProperty({ description: 'Load averages [1m, 5m, 15m]' })
  @IsArray()
  @IsNumber({}, { each: true })
  loadAvg: number[];

  @ApiProperty({ description: 'Current CPU usage percentage' })
  @IsNumber()
  usagePercent: number;
}

/**
 * Host monitoring metrics DTO
 */
export class HostMetricsDto {
  @ApiProperty({ description: 'Disk metrics', type: [DiskMetricsDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiskMetricsDto)
  diskMetrics: DiskMetricsDto[];

  @ApiProperty({ description: 'Memory metrics' })
  @ValidateNested()
  @Type(() => MemoryMetricsDto)
  memoryMetrics: MemoryMetricsDto;

  @ApiProperty({ description: 'CPU metrics' })
  @ValidateNested()
  @Type(() => CpuMetricsDto)
  cpuMetrics: CpuMetricsDto;

  @ApiPropertyOptional({ description: 'Additional metrics' })
  @IsOptional()
  @IsObject()
  additionalMetrics?: Record<string, unknown>;

  @ApiProperty({ description: 'Metrics timestamp' })
  @IsString()
  timestamp: string;
}
