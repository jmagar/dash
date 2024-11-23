import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsObject, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { HostOperationResultDto } from './common.dto';

/**
 * Base response DTO
 */
export class BaseResponseDto {
  @ApiProperty({ description: 'Response success status' })
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional({ description: 'Error message if request failed' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ description: 'Response metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Paginated response metadata DTO
 */
export class PaginationMetadataDto {
  @ApiProperty({ description: 'Total number of items' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Number of items per page' })
  @IsNumber()
  perPage: number;

  @ApiProperty({ description: 'Current page number' })
  @IsNumber()
  currentPage: number;

  @ApiProperty({ description: 'Total number of pages' })
  @IsNumber()
  totalPages: number;

  @ApiPropertyOptional({ description: 'Has more pages flag' })
  @IsOptional()
  @IsBoolean()
  hasMore?: boolean;
}

/**
 * Paginated response DTO
 */
export class PaginatedResponseDto<T> extends BaseResponseDto {
  @ApiProperty({ description: 'Response data array' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(/* istanbul ignore next */ () => Object as unknown as T)
  data: T[];

  @ApiProperty({ description: 'Pagination metadata' })
  @ValidateNested()
  @Type(() => PaginationMetadataDto)
  pagination: PaginationMetadataDto;
}

/**
 * Host operation response DTO
 */
export class HostOperationResponseDto<T = unknown> extends BaseResponseDto {
  @ApiPropertyOptional({ description: 'Operation result' })
  @IsOptional()
  @ValidateNested()
  @Type(() => HostOperationResultDto)
  operation?: HostOperationResultDto<T>;
}

/**
 * Bulk operation response DTO
 */
export class BulkOperationResponseDto extends BaseResponseDto {
  @ApiProperty({ description: 'Number of successful operations' })
  @IsNumber()
  successCount: number;

  @ApiProperty({ description: 'Number of failed operations' })
  @IsNumber()
  failureCount: number;

  @ApiPropertyOptional({ description: 'Failed operation details' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HostOperationResultDto)
  failures?: HostOperationResultDto[];
}
