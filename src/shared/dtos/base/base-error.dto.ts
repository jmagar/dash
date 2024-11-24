import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject, ValidateNested, IsEnum, IsUUID, Matches, MinLength, MaxLength, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum ErrorSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

export class ErrorLocation {
  @ApiProperty({ description: 'File where the error occurred' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  file: string;

  @ApiProperty({ description: 'Line number where the error occurred' })
  @IsNumber()
  @IsOptional()
  line?: number;

  @ApiProperty({ description: 'Column number where the error occurred' })
  @IsNumber()
  @IsOptional()
  column?: number;

  @ApiProperty({ description: 'Function or method name where the error occurred' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  function?: string;

  @ApiProperty({ description: 'Class name where the error occurred' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  class?: string;

  @ApiProperty({ description: 'Stack trace for the error' })
  @IsString()
  @IsOptional()
  stackTrace?: string;

  constructor(partial: Partial<ErrorLocation>) {
    this.file = '';
    Object.assign(this, partial);
  }
}

export class BaseErrorDto {
  @ApiProperty({ description: 'Error code for the error' })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'Error code must be uppercase alphanumeric with underscores, starting with a letter'
  })
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Error category for grouping similar errors' })
  @IsString()
  @Matches(/^[A-Z][A-Za-z0-9_]*$/, {
    message: 'Category must start with uppercase letter and contain only alphanumeric characters and underscores'
  })
  @MinLength(3)
  @MaxLength(50)
  category: string;

  @ApiProperty({ description: 'Error subcategory for more specific grouping' })
  @IsString()
  @Matches(/^[A-Z][A-Za-z0-9_]*$/, {
    message: 'Subcategory must start with uppercase letter and contain only alphanumeric characters and underscores'
  })
  @MinLength(3)
  @MaxLength(50)
  @IsOptional()
  subcategory?: string;

  @ApiProperty({ description: 'Human readable error message' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @ApiProperty({ description: 'Detailed error description' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @IsOptional()
  details?: string;

  @ApiProperty({ description: 'Error severity level', enum: ErrorSeverity })
  @IsEnum(ErrorSeverity)
  severity: ErrorSeverity = ErrorSeverity.ERROR;

  @ApiProperty({ description: 'Timestamp when the error occurred' })
  @IsDateString()
  timestamp: string = new Date().toISOString();

  @ApiProperty({ description: 'Request ID associated with the error' })
  @IsUUID()
  @IsOptional()
  requestId?: string;

  @ApiProperty({ description: 'Correlation ID for linking related errors' })
  @IsUUID()
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
    this.code = 'ERR_UNKNOWN';
    this.category = 'UNKNOWN';
    this.message = 'An unknown error occurred';
    Object.assign(this, partial);

    // Initialize location if provided
    if (partial.location) {
      this.location = new ErrorLocation(partial.location);
    }
  }
}
