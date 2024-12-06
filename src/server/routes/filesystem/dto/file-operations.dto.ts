import { IsString, IsArray, IsBoolean, IsOptional, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for file listing operations
 */
export class ListFilesDto {
  @ApiPropertyOptional({ description: 'Path to list files from', default: '' })
  @IsString()
  @IsOptional()
  path = '';

  @ApiPropertyOptional({ description: 'Whether to show hidden files', default: false })
  @IsOptional()
  @IsBoolean()
  showHidden?: boolean;
}

/**
 * DTO for file upload operations
 */
export class UploadFilesDto {
  @ApiPropertyOptional({ description: 'Target path for uploaded files', default: '' })
  @IsString()
  @IsOptional()
  path = '';

  // Files will be handled by multer
}

/**
 * DTO for copy/move operations
 */
export class CopyMoveDto {
  @ApiProperty({ description: 'Source path of the file/directory to copy/move' })
  @IsString()
  @IsNotEmpty()
  sourcePath: string;

  @ApiProperty({ description: 'ID of the target filesystem location' })
  @IsString()
  @IsNotEmpty()
  targetLocationId: string;

  @ApiProperty({ description: 'Target path where to copy/move the file/directory' })
  @IsString()
  @IsNotEmpty()
  targetPath: string;

  @ApiPropertyOptional({ description: 'Whether to copy/move directories recursively', default: true })
  @IsOptional()
  @IsBoolean()
  recursive?: boolean = true;

  @ApiPropertyOptional({ description: 'Whether to overwrite existing files', default: false })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean = false;
}

/**
 * DTO for creating directories
 */
export class CreateDirectoryDto {
  @ApiProperty({ description: 'Parent directory path' })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty({ description: 'Name of the new directory' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

/**
 * DTO for deleting files/directories
 */
export class DeleteFilesDto {
  @ApiProperty({ description: 'Array of paths to delete', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  paths: string[];
}

/**
 * DTO for file selection filter options
 */
export class FileFilterDto {
  @ApiPropertyOptional({ description: 'Array of allowed file extensions', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  extensions?: string[];

  @ApiPropertyOptional({ description: 'Array of allowed MIME types', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  mimeTypes?: string[];
}

/**
 * DTO for file selection operations
 */
export class SelectFilesDto {
  @ApiProperty({ description: 'Array of paths to select', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  paths: string[];

  @ApiProperty({ description: 'Type of items to select', enum: ['file', 'directory'] })
  @IsString()
  @IsNotEmpty()
  type: 'file' | 'directory';

  @ApiPropertyOptional({ description: 'Whether to allow multiple selections', default: false })
  @IsOptional()
  @IsBoolean()
  multiple?: boolean;

  @ApiPropertyOptional({ description: 'Filter options for file selection', type: () => FileFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileFilterDto)
  filter?: FileFilterDto;
}

/**
 * DTO for file search operations
 */
export class SearchFilesDto {
  @ApiProperty({ description: 'Search query string' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ description: 'Base path to search from' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  path?: string;

  @ApiPropertyOptional({ description: 'Whether to search recursively in subdirectories', default: true })
  @IsOptional()
  @IsBoolean()
  recursive?: boolean = true;

  @ApiPropertyOptional({ description: 'Filter options for search results', type: () => FileFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileFilterDto)
  filter?: FileFilterDto;
}
