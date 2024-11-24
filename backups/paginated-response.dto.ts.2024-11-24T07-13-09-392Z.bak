import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsPositive } from 'class-validator';
import { BaseResponseDto } from './base-response.dto';

export class PaginatedResponseDto<T> extends BaseResponseDto<T[]> {
  @ApiProperty({ description: 'Array of items for the current page' })
  @IsArray()
  data: T[];

  @ApiProperty({ description: 'Total number of items across all pages' })
  @IsNumber()
  @IsPositive()
  total: number;

  @ApiProperty({ description: 'Current page number' })
  @IsNumber()
  @IsPositive()
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  @IsNumber()
  @IsPositive()
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  @IsNumber()
  @IsPositive()
  totalPages: number;

  @ApiProperty({ description: 'Indicates if there is a next page' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Indicates if there is a previous page' })
  hasPreviousPage: boolean;

  constructor(partial: Partial<PaginatedResponseDto<T>>) {
    super(partial);
    this.hasNextPage = this.page < this.totalPages;
    this.hasPreviousPage = this.page > 1;
  }
}
