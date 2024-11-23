import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for file filtering operations
 */
export class FileFilterDto {
  @ApiPropertyOptional({
    description: 'File name pattern to match',
    example: '*.txt',
  })
  @IsString()
  @IsOptional()
  pattern?: string;

  @ApiPropertyOptional({
    description: 'List of file extensions to include',
    example: ['.txt', '.md'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  extensions?: string[];

  @ApiPropertyOptional({
    description: 'Whether to include hidden files',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  includeHidden?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to search recursively in subdirectories',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  recursive?: boolean;
}
