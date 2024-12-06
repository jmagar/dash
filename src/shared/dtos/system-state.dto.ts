import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidResourceValue } from './base/validators/is-valid-resource-value.validator';
import { IsValidPath } from './base/validators/is-valid-path.validator';

export class CacheStatusDto {
  @ApiProperty({ description: 'Cache connection status' })
  @IsBoolean()
  connected!: boolean;

  @ApiProperty({ description: 'Current cache state' })
  @IsString()
  state!: string;

  @ApiProperty({ description: 'Memory usage in bytes' })
  @IsValidResourceValue({ min: 0 })
  memoryUsage!: number;

  @ApiProperty({ description: 'Total number of keys in cache' })
  @IsValidResourceValue({ min: 0 })
  totalKeys!: number;
}

export class DbStatusDto {
  @ApiProperty({ description: 'Database connection status' })
  @IsBoolean()
  connected!: boolean;

  @ApiProperty({ description: 'Connection pool size' })
  @IsValidResourceValue({ min: 0 })
  poolSize!: number;

  @ApiProperty({ description: 'Number of active connections' })
  @IsValidResourceValue({ min: 0 })
  activeConnections!: number;
}

export class SystemMetricsDto {
  @ApiProperty({ description: 'System load average' })
  @IsValidResourceValue({ min: 0, max: 100 })
  systemLoad!: number;

  @ApiProperty({ description: 'Memory usage percentage' })
  @IsValidResourceValue({ min: 0, max: 100 })
  memoryUsage!: number;

  @ApiProperty({ description: 'Number of active users' })
  @IsValidResourceValue({ min: 0 })
  activeUsers!: number;
}

export class FileSystemStateDto {
  @ApiProperty({ description: 'Current working directory' })
  @IsString()
  @IsValidPath()
  currentDirectory!: string;

  @ApiProperty({ description: 'Recently accessed files' })
  @IsArray()
  @IsString({ each: true })
  @IsValidPath({ each: true })
  recentFiles!: string[];

  @ApiProperty({ description: 'Directories being watched' })
  @IsArray()
  @IsString({ each: true })
  @IsValidPath({ each: true })
  watchedDirectories!: string[];

  @ApiProperty({ description: 'Available mount points' })
  @IsArray()
  @IsString({ each: true })
  mountPoints!: string[];
}

export class SystemStateDto {
  @ApiProperty({ description: 'Cache status information' })
  @ValidateNested()
  @Type(() => CacheStatusDto)
  cacheStatus!: CacheStatusDto;

  @ApiProperty({ description: 'Database status information' })
  @ValidateNested()
  @Type(() => DbStatusDto)
  dbStatus!: DbStatusDto;

  @ApiProperty({ description: 'Active host IDs' })
  @IsArray()
  @IsString({ each: true })
  activeHosts!: string[];

  @ApiProperty({ description: 'System metrics' })
  @ValidateNested()
  @Type(() => SystemMetricsDto)
  metrics!: SystemMetricsDto;

  @ApiProperty({ description: 'File system state' })
  @ValidateNested()
  @Type(() => FileSystemStateDto)
  fileSystem!: FileSystemStateDto;

  constructor(partial: Partial<SystemStateDto>) {
    Object.assign(this, partial);
  }
}
