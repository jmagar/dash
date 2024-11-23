import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject, IsEnum, IsDateString } from 'class-validator';

/**
 * Host operation status enum
 */
export enum HostOperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Host operation result DTO
 */
export class HostOperationResultDto<T = unknown> {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Operation result data' })
  @IsOptional()
  data?: T;

  @ApiPropertyOptional({ description: 'Error message if operation failed' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({ description: 'Operation status', enum: HostOperationStatus })
  @IsEnum(HostOperationStatus)
  status: HostOperationStatus;

  @ApiProperty({ description: 'Operation start time' })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ description: 'Operation end time' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Operation duration in milliseconds' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'Operation metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Host error DTO
 */
export class HostErrorDto {
  @ApiProperty({ description: 'Error code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Error message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Error details' })
  @IsOptional()
  @IsString()
  details?: string;

  @ApiProperty({ description: 'Error timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: 'Error metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Stack trace in development' })
  @IsOptional()
  @IsString()
  stack?: string;
}

/**
 * Host validation error DTO
 */
export class HostValidationErrorDto extends HostErrorDto {
  @ApiProperty({ description: 'Validation constraints that failed' })
  @IsObject()
  constraints: Record<string, string>;

  @ApiProperty({ description: 'Invalid property path' })
  @IsString()
  property: string;

  @ApiPropertyOptional({ description: 'Invalid value' })
  @IsOptional()
  value?: unknown;
}
