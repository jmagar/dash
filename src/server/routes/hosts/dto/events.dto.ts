import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject, IsDateString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { HostOperationStatus } from './common.dto';

/**
 * Host event type enum
 */
export enum HostEventType {
  AGENT = 'agent',
  SYSTEM = 'system',
  PROCESS = 'process',
  SECURITY = 'security',
  MONITORING = 'monitoring',
  CUSTOM = 'custom'
}

/**
 * Host event severity enum
 */
export enum HostEventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Host event source DTO
 */
export class HostEventSourceDto {
  @ApiProperty({ description: 'Event source type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Event source identifier' })
  @IsString()
  identifier: string;

  @ApiPropertyOptional({ description: 'Event source metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Host event context DTO
 */
export class HostEventContextDto {
  @ApiProperty({ description: 'Operation status', enum: HostOperationStatus })
  @IsEnum(HostOperationStatus)
  operationStatus: HostOperationStatus;

  @ApiPropertyOptional({ description: 'Related entities' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedEntities?: string[];

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsOptional()
  @IsObject()
  additionalContext?: Record<string, unknown>;
}

/**
 * Host event DTO
 */
export class HostEventDto {
  @ApiProperty({ description: 'Event type', enum: HostEventType })
  @IsEnum(HostEventType)
  type: HostEventType;

  @ApiProperty({ description: 'Event severity', enum: HostEventSeverity })
  @IsEnum(HostEventSeverity)
  severity: HostEventSeverity;

  @ApiProperty({ description: 'Event message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Event source' })
  @ValidateNested()
  @Type(() => HostEventSourceDto)
  source: HostEventSourceDto;

  @ApiPropertyOptional({ description: 'Event context' })
  @IsOptional()
  @ValidateNested()
  @Type(() => HostEventContextDto)
  context?: HostEventContextDto;

  @ApiPropertyOptional({ description: 'Event metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Host event filter DTO
 */
export class HostEventFilterDto {
  @ApiPropertyOptional({ description: 'Filter by event types', enum: HostEventType, isArray: true })
  @IsOptional()
  @IsEnum(HostEventType, { each: true })
  types?: HostEventType[];

  @ApiPropertyOptional({ description: 'Filter by severities', enum: HostEventSeverity, isArray: true })
  @IsOptional()
  @IsEnum(HostEventSeverity, { each: true })
  severities?: HostEventSeverity[];

  @ApiPropertyOptional({ description: 'Filter by source type' })
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional({ description: 'Filter by start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Additional filter metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
