import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsJSON, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { SortDirection } from '../enums';

export class SortField {
  @ApiProperty({ description: 'Field to sort by' })
  @IsString()
  @IsNotEmpty()
  field!: string;

  @ApiProperty({ description: 'Sort direction', enum: SortDirection })
  @IsEnum(SortDirection)
  @IsOptional()
  direction: SortDirection = SortDirection.ASC;

  constructor(partial?: Partial<SortField>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class BaseSearchDto {
  @ApiProperty({ description: 'Search query string', required: false })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiProperty({ description: 'Page number for pagination', minimum: 1, default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiProperty({ description: 'Number of items per page', minimum: 1, default: 10 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit = 10;

  @ApiProperty({ description: 'Sort fields', type: [SortField], required: false })
  @ValidateNested({ each: true })
  @Type(() => SortField)
  @IsOptional()
  sort?: SortField[] = [];

  @ApiProperty({ description: 'Fields to include in the response', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fields?: string[] = [];

  @ApiProperty({ description: 'Filter string in JSON format', required: false })
  @IsJSON()
  @IsOptional()
  filters?: string;

  constructor(partial?: Partial<BaseSearchDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  /**
   * Parse the filters string into an object
   * @returns Parsed filters object or null if filters is not set or invalid
   */
  getFilters<T = Record<string, unknown>>(): T | null {
    try {
      return this.filters ? JSON.parse(this.filters) as T : null;
    } catch {
      return null;
    }
  }
}
