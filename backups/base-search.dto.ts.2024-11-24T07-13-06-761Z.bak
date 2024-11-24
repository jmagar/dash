import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class SortOption {
  @ApiProperty({ description: 'Field to sort by' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Sort direction', enum: SortDirection })
  @IsEnum(SortDirection)
  direction: SortDirection = SortDirection.ASC;
}

export class BaseSearchDto {
  @ApiProperty({ description: 'Search query string', required: false })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiProperty({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiProperty({ description: 'Number of items per page', default: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit: number = 10;

  @ApiProperty({ description: 'Sort options', required: false, type: [SortOption] })
  @IsArray()
  @IsOptional()
  sort?: SortOption[];

  @ApiProperty({ description: 'Fields to include in the response', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fields?: string[];

  @ApiProperty({ description: 'Filter criteria in JSON format', required: false })
  @IsString()
  @IsOptional()
  filters?: string;

  constructor(partial: Partial<BaseSearchDto>) {
    Object.assign(this, partial);
  }
}
