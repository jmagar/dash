import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsObject } from 'class-validator';

/**
 * Process information DTO
 */
export class ProcessInfoDto {
  @ApiProperty({ description: 'Process ID' })
  @IsNumber()
  pid: number;

  @ApiProperty({ description: 'Process name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Process command' })
  @IsString()
  command: string;

  @ApiProperty({ description: 'CPU usage percentage' })
  @IsNumber()
  cpuPercent: number;

  @ApiProperty({ description: 'Memory usage in bytes' })
  @IsNumber()
  memoryBytes: number;

  @ApiProperty({ description: 'Process state' })
  @IsString()
  state: string;

  @ApiPropertyOptional({ description: 'Process owner' })
  @IsOptional()
  @IsString()
  owner?: string;

  @ApiPropertyOptional({ description: 'Process start time' })
  @IsOptional()
  @IsString()
  startTime?: string;
}

/**
 * Process list request DTO
 */
export class ProcessListRequestDto {
  @ApiPropertyOptional({ description: 'Filter by process name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by process owner' })
  @IsOptional()
  @IsString()
  owner?: string;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: 'pid' | 'name' | 'cpuPercent' | 'memoryBytes';

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsBoolean()
  ascending?: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of processes to return' })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

/**
 * Process control request DTO
 */
export class ProcessControlRequestDto {
  @ApiProperty({ description: 'Process IDs' })
  @IsArray()
  @IsNumber({}, { each: true })
  pids: number[];

  @ApiProperty({ description: 'Control action' })
  @IsString()
  action: 'stop' | 'start' | 'restart' | 'kill';

  @ApiPropertyOptional({ description: 'Signal number for kill action' })
  @IsOptional()
  @IsNumber()
  signal?: number;

  @ApiPropertyOptional({ description: 'Additional options' })
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

/**
 * Process control response DTO
 */
export class ProcessControlResponseDto {
  @ApiProperty({ description: 'Process ID' })
  @IsNumber()
  pid: number;

  @ApiProperty({ description: 'Action performed' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Action success status' })
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional({ description: 'Error message if action failed' })
  @IsOptional()
  @IsString()
  error?: string;
}
