import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsBoolean, IsNumber, IsDate, IsEnum, IsArray, ValidateNested, IsOptional, IsNotEmpty } from 'class-validator';
import { FileSystemType } from '../../../../types/filesystem';
import { ApiResult } from '../../../../types/error';
import { LogMetadata } from '../../../../types/logger';

/**
 * Base filesystem response with metadata
 */
export type FileSystemResponse<T> = ApiResult<T> & {
  metadata?: LogMetadata & {
    locationId?: string;
    path?: string;
    operationId?: string;
    transferSpeed?: number;
    transferProgress?: number;
  };
};

/**
 * DTO for file/directory items
 */
export class FileItemDto {
  @ApiProperty({ description: 'Name of the file/directory' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Full path to the file/directory' })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty({ description: 'Whether this is a directory' })
  @IsBoolean()
  isDirectory: boolean;

  @ApiProperty({ description: 'Size in bytes' })
  @IsNumber()
  size: number;

  @ApiProperty({ description: 'Last modified timestamp' })
  @IsString()
  modifiedTime: string;

  @ApiPropertyOptional({ description: 'File permissions' })
  @IsOptional()
  @IsString()
  permissions?: string;

  @ApiPropertyOptional({ description: 'MIME type if available' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'File extension' })
  @IsOptional()
  @IsString()
  extension?: string;

  @ApiPropertyOptional({ description: 'Whether the file is hidden' })
  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @ApiPropertyOptional({ description: 'File metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * DTO for breadcrumb navigation
 */
export class BreadcrumbDto {
  @ApiProperty({ description: 'Name of the path segment' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Full path up to this segment' })
  @IsString()
  @IsNotEmpty()
  path: string;
}

/**
 * DTO for directory listing response
 */
export class FileListResponseDto extends FileSystemResponse<FileItemDto[]> {
  @ApiProperty({ description: 'Current directory path' })
  @IsString()
  path: string;

  @ApiProperty({ type: [FileItemDto], description: 'List of files and directories' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileItemDto)
  files: FileItemDto[];

  @ApiProperty({ type: [BreadcrumbDto], description: 'Breadcrumb navigation' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreadcrumbDto)
  breadcrumbs: BreadcrumbDto[];

  @ApiPropertyOptional({ description: 'Total number of items' })
  @IsOptional()
  @IsNumber()
  totalItems?: number;

  @ApiPropertyOptional({ description: 'Total size of all files' })
  @IsOptional()
  @IsNumber()
  totalSize?: number;
}

/**
 * DTO for space items in quick access
 */
export class QuickAccessItemDto {
  @ApiProperty({ description: 'ID of the filesystem location' })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({ description: 'Path to the item' })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty({ description: 'Type of item', enum: ['file', 'directory'] })
  @IsEnum(['file', 'directory'])
  type: 'file' | 'directory';

  @ApiProperty({ description: 'Name of the item' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Last access timestamp' })
  @IsOptional()
  @IsString()
  accessTime?: string;
}

/**
 * DTO for quick access response
 */
export class QuickAccessResponseDto extends FileSystemResponse<{
  favorites: QuickAccessItemDto[];
  recent: QuickAccessItemDto[];
}> {
  @ApiProperty({ type: [QuickAccessItemDto], description: 'Favorite items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickAccessItemDto)
  favorites: QuickAccessItemDto[];

  @ApiProperty({ type: [QuickAccessItemDto], description: 'Recently accessed items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickAccessItemDto)
  recent: QuickAccessItemDto[];
}

/**
 * DTO for file change events
 */
export class FileChangeEventDto {
  @ApiProperty({ description: 'Type of change', enum: ['created', 'modified', 'deleted'] })
  @IsEnum(['created', 'modified', 'deleted'])
  type: 'created' | 'modified' | 'deleted';

  @ApiProperty({ description: 'ID of the filesystem location' })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({ description: 'Path of the changed file' })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiPropertyOptional({ type: () => FileItemDto, description: 'File details if available' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileItemDto)
  item?: FileItemDto;

  @ApiPropertyOptional({ description: 'Timestamp of the change' })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

/**
 * DTO for transfer progress events
 */
export class TransferProgressEventDto {
  @ApiProperty({ description: 'Unique operation ID' })
  @IsString()
  @IsNotEmpty()
  operationId: string;

  @ApiProperty({ description: 'Type of transfer', enum: ['copy', 'move', 'upload', 'download'] })
  @IsEnum(['copy', 'move', 'upload', 'download'])
  type: 'copy' | 'move' | 'upload' | 'download';

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  @IsNumber()
  progress: number;

  @ApiProperty({ description: 'Transfer speed in bytes per second' })
  @IsNumber()
  speed: number;

  @ApiProperty({ description: 'Remaining time in seconds' })
  @IsNumber()
  remaining: number;

  @ApiPropertyOptional({ description: 'Number of files processed' })
  @IsOptional()
  @IsNumber()
  filesProcessed?: number;

  @ApiPropertyOptional({ description: 'Total number of files' })
  @IsOptional()
  @IsNumber()
  totalFiles?: number;

  @ApiPropertyOptional({ description: 'Bytes transferred' })
  @IsOptional()
  @IsNumber()
  bytesTransferred?: number;

  @ApiPropertyOptional({ description: 'Total bytes to transfer' })
  @IsOptional()
  @IsNumber()
  totalBytes?: number;

  @ApiPropertyOptional({ description: 'Current file being processed' })
  @IsOptional()
  @IsString()
  currentFile?: string;
}
