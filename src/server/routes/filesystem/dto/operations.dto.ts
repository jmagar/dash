import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsObject, IsBoolean, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { BaseFileSystemEntityDto } from './base.dto';

/**
 * File operation type enum
 */
export enum FileOperationType {
  COPY = 'copy',
  MOVE = 'move',
  DELETE = 'delete',
  RENAME = 'rename',
  COMPRESS = 'compress',
  EXTRACT = 'extract'
}

/**
 * File operation status enum
 */
export enum FileOperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * File operation progress DTO
 */
export class FileOperationProgressDto {
  @ApiProperty({ description: 'Total number of files' })
  @IsNumber()
  @Min(0)
  totalFiles: number;

  @ApiProperty({ description: 'Number of processed files' })
  @IsNumber()
  @Min(0)
  processedFiles: number;

  @ApiProperty({ description: 'Total size in bytes' })
  @IsNumber()
  @Min(0)
  totalSize: number;

  @ApiProperty({ description: 'Processed size in bytes' })
  @IsNumber()
  @Min(0)
  processedSize: number;

  @ApiProperty({ description: 'Progress percentage', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiPropertyOptional({ description: 'Current file being processed' })
  @IsOptional()
  @IsString()
  currentFile?: string;

  @ApiPropertyOptional({ description: 'Operation speed in bytes per second' })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({ description: 'Estimated time remaining in seconds' })
  @IsOptional()
  @IsNumber()
  estimatedTimeRemaining?: number;
}

/**
 * File operation request DTO
 */
export class FileOperationRequestDto {
  @ApiProperty({ description: 'Operation type', enum: FileOperationType })
  operationType: FileOperationType;

  @ApiProperty({ description: 'Source files', type: [BaseFileSystemEntityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseFileSystemEntityDto)
  sourceFiles: BaseFileSystemEntityDto[];

  @ApiPropertyOptional({ description: 'Target path' })
  @IsOptional()
  @IsString()
  targetPath?: string;

  @ApiPropertyOptional({ description: 'Operation options' })
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

/**
 * File operation result DTO
 */
export class FileOperationResultDto {
  @ApiProperty({ description: 'Operation ID' })
  @IsString()
  operationId: string;

  @ApiProperty({ description: 'Operation type', enum: FileOperationType })
  operationType: FileOperationType;

  @ApiProperty({ description: 'Operation status', enum: FileOperationStatus })
  status: FileOperationStatus;

  @ApiProperty({ description: 'Operation progress' })
  @ValidateNested()
  @Type(() => FileOperationProgressDto)
  progress: FileOperationProgressDto;

  @ApiPropertyOptional({ description: 'Error message if operation failed' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ description: 'Operation result metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Operation start time' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Operation end time' })
  @IsOptional()
  @IsString()
  endTime?: string;
}

/**
 * Bulk file operation request DTO
 */
export class BulkFileOperationRequestDto {
  @ApiProperty({ description: 'Operations to perform', type: [FileOperationRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileOperationRequestDto)
  operations: FileOperationRequestDto[];

  @ApiPropertyOptional({ description: 'Stop on first error' })
  @IsOptional()
  @IsBoolean()
  stopOnError?: boolean;

  @ApiPropertyOptional({ description: 'Maximum concurrent operations' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxConcurrent?: number;
}

/**
 * Bulk file operation result DTO
 */
export class BulkFileOperationResultDto {
  @ApiProperty({ description: 'Bulk operation ID' })
  @IsString()
  bulkOperationId: string;

  @ApiProperty({ description: 'Operation results', type: [FileOperationResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileOperationResultDto)
  results: FileOperationResultDto[];

  @ApiProperty({ description: 'Overall status', enum: FileOperationStatus })
  status: FileOperationStatus;

  @ApiProperty({ description: 'Number of successful operations' })
  @IsNumber()
  successCount: number;

  @ApiProperty({ description: 'Number of failed operations' })
  @IsNumber()
  failureCount: number;

  @ApiPropertyOptional({ description: 'Overall error message' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ description: 'Operation metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
