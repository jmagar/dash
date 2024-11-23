import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsObject, IsBoolean, IsArray, ValidateNested, IsEnum, Min } from 'class-validator';

/**
 * Search mode enum
 */
export enum FileSearchMode {
  EXACT = 'exact',
  WILDCARD = 'wildcard',
  REGEX = 'regex'
}

/**
 * Search scope enum
 */
export enum FileSearchScope {
  FILENAME = 'filename',
  CONTENT = 'content',
  BOTH = 'both'
}

/**
 * File search criteria DTO
 */
export class FileSearchCriteriaDto {
  @ApiProperty({ description: 'Search pattern' })
  @IsString()
  pattern: string;

  @ApiProperty({ description: 'Search mode', enum: FileSearchMode })
  @IsEnum(FileSearchMode)
  mode: FileSearchMode;

  @ApiProperty({ description: 'Search scope', enum: FileSearchScope })
  @IsEnum(FileSearchScope)
  scope: FileSearchScope;

  @ApiPropertyOptional({ description: 'Case sensitive search' })
  @IsOptional()
  @IsBoolean()
  caseSensitive?: boolean;

  @ApiPropertyOptional({ description: 'Search in hidden files' })
  @IsOptional()
  @IsBoolean()
  includeHidden?: boolean;

  @ApiPropertyOptional({ description: 'File extensions to include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extensions?: string[];

  @ApiPropertyOptional({ description: 'Minimum file size in bytes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSize?: number;

  @ApiPropertyOptional({ description: 'Maximum file size in bytes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSize?: number;

  @ApiPropertyOptional({ description: 'Modified after date' })
  @IsOptional()
  @IsString()
  modifiedAfter?: string;

  @ApiPropertyOptional({ description: 'Modified before date' })
  @IsOptional()
  @IsString()
  modifiedBefore?: string;

  @ApiPropertyOptional({ description: 'Additional search criteria' })
  @IsOptional()
  @IsObject()
  additionalCriteria?: Record<string, unknown>;
}

/**
 * File search match DTO
 */
export class FileSearchMatchDto {
  @ApiProperty({ description: 'File path' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'Line number of match' })
  @IsOptional()
  @IsNumber()
  lineNumber?: number;

  @ApiPropertyOptional({ description: 'Column number of match' })
  @IsOptional()
  @IsNumber()
  columnNumber?: number;

  @ApiPropertyOptional({ description: 'Matched content snippet' })
  @IsOptional()
  @IsString()
  matchedContent?: string;

  @ApiPropertyOptional({ description: 'Match metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * File search request DTO
 */
export class FileSearchRequestDto {
  @ApiProperty({ description: 'Search criteria' })
  @ValidateNested()
  @Type(() => FileSearchCriteriaDto)
  criteria: FileSearchCriteriaDto;

  @ApiPropertyOptional({ description: 'Maximum results to return' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search timeout in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeout?: number;

  @ApiPropertyOptional({ description: 'Base directory for search' })
  @IsOptional()
  @IsString()
  baseDir?: string;
}

/**
 * File search result DTO
 */
export class FileSearchResultDto {
  @ApiProperty({ description: 'Search matches', type: [FileSearchMatchDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileSearchMatchDto)
  matches: FileSearchMatchDto[];

  @ApiProperty({ description: 'Total matches found' })
  @IsNumber()
  totalMatches: number;

  @ApiPropertyOptional({ description: 'Search was truncated' })
  @IsOptional()
  @IsBoolean()
  truncated?: boolean;

  @ApiPropertyOptional({ description: 'Search duration in milliseconds' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'Search result metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
