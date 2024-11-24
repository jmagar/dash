import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class BaseResponseDto<T> {
    @ApiProperty({ description: 'Whether the operation was successful' })
    success: boolean;

    @ApiPropertyOptional({ description: 'Response data' })
    data?: T;

    @ApiPropertyOptional({ description: 'Error message if operation failed' })
    error?: string;

    @ApiPropertyOptional({ description: 'Additional metadata' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}

export class PaginatedResponseDto<T> extends BaseResponseDto<T[]> {
    @ApiProperty({ description: 'Total number of items' })
    @IsNumber()
    total: number;

    @ApiProperty({ description: 'Current page number' })
    @IsNumber()
    page: number;

    @ApiProperty({ description: 'Number of items per page' })
    @IsNumber()
    limit: number;
}
