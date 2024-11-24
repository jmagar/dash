import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ErrorLocation {
  @ApiProperty({ description: 'File where the error occurred' })
  @IsString()
  file?: string;

  @ApiProperty({ description: 'Line number where the error occurred' })
  @IsNumber()
  line?: number;

  @ApiProperty({ description: 'Column number where the error occurred' })
  @IsNumber()
  column?: number;

  @ApiProperty({ description: 'Function or method name where the error occurred' })
  @IsString()
  @IsOptional()
  function?: string;

  @ApiProperty({ description: 'Class name where the error occurred' })
  @IsString()
  @IsOptional()
  class?: string;

  @ApiProperty({ description: 'Stack trace for the error' })
  @IsString()
  @IsOptional()
  stackTrace?: string;

  @ApiProperty({ description: 'Additional context about the error location' })
  @IsObject()
  @IsOptional()
  context?: Record<string, unknown>;
}

export class BaseErrorDto {
  @ApiProperty({ description: 'Error code for the error' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Error category for grouping similar errors' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Error subcategory for more specific grouping' })
  @IsString()
  @IsOptional()
  subcategory?: string;

  @ApiProperty({ description: 'Human readable error message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Detailed error description' })
  @IsString()
  @IsOptional()
  details?: string;

  @ApiProperty({ description: 'Error severity level' })
  @IsString()
  severity: 'ERROR' | 'WARNING' | 'INFO';

  @ApiProperty({ description: 'Timestamp when the error occurred' })
  @IsString()
  timestamp: string = new Date().toISOString();

  @ApiProperty({ description: 'Request ID associated with the error' })
  @IsString()
  @IsOptional()
  requestId?: string;

  @ApiProperty({ description: 'Correlation ID for linking related errors' })
  @IsString()
  @IsOptional()
  correlationId?: string;

  @ApiProperty({ description: 'Location information for the error' })
  @ValidateNested()
  @Type(() => ErrorLocation)
  @IsOptional()
  location?: ErrorLocation;

  @ApiProperty({ description: 'Additional error metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  constructor(partial: Partial<BaseErrorDto>) {
    Object.assign(this, partial);
  }
}
