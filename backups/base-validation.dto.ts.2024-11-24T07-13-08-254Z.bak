import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export enum ValidationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export class ValidationError {
  @ApiProperty({ description: 'Field that failed validation' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Validation error message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Validation error severity', enum: ValidationSeverity })
  @IsEnum(ValidationSeverity)
  severity: ValidationSeverity;

  @ApiProperty({ description: 'Validation error code', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  constructor(partial: Partial<ValidationError>) {
    Object.assign(this, partial);
  }
}

export class BaseValidationDto {
  @ApiProperty({ description: 'Overall validation result' })
  @IsBoolean()
  isValid: boolean;

  @ApiProperty({ description: 'List of validation errors', type: [ValidationError] })
  @IsArray()
  errors: ValidationError[];

  @ApiProperty({ description: 'Additional validation context', required: false })
  @IsString()
  @IsOptional()
  context?: string;

  constructor(partial: Partial<BaseValidationDto>) {
    Object.assign(this, partial);
    this.errors = this.errors?.map(error => new ValidationError(error)) ?? [];
  }
}
