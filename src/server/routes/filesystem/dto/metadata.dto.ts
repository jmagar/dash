import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsObject, IsBoolean, IsArray, ValidateNested, IsEnum, IsDate } from 'class-validator';

/**
 * File type enum
 */
export enum FileType {
  FILE = 'file',
  DIRECTORY = 'directory',
  SYMLINK = 'symlink',
  SPECIAL = 'special'
}

/**
 * File metadata DTO
 */
export class FileMetadataDto {
  @ApiProperty({ description: 'File name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'File path' })
  @IsString()
  path: string;

  @ApiProperty({ description: 'File type', enum: FileType })
  @IsEnum(FileType)
  type: FileType;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  size: number;

  @ApiProperty({ description: 'Creation time' })
  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  @ApiProperty({ description: 'Last modification time' })
  @Type(() => Date)
  @IsDate()
  modifiedAt: Date;

  @ApiProperty({ description: 'Last access time' })
  @Type(() => Date)
  @IsDate()
  accessedAt: Date;

  @ApiPropertyOptional({ description: 'MIME type' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'File extension' })
  @IsOptional()
  @IsString()
  extension?: string;

  @ApiPropertyOptional({ description: 'File hash (if available)' })
  @IsOptional()
  @IsString()
  hash?: string;

  @ApiPropertyOptional({ description: 'Is hidden file' })
  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @ApiPropertyOptional({ description: 'Is system file' })
  @IsOptional()
  @IsBoolean()
  system?: boolean;

  @ApiPropertyOptional({ description: 'Is read-only' })
  @IsOptional()
  @IsBoolean()
  readonly?: boolean;

  @ApiPropertyOptional({ description: 'Custom attributes' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}

/**
 * Directory metadata DTO
 */
export class DirectoryMetadataDto extends FileMetadataDto {
  @ApiPropertyOptional({ description: 'Number of items in directory' })
  @IsOptional()
  @IsNumber()
  itemCount?: number;

  @ApiPropertyOptional({ description: 'Total size of directory contents' })
  @IsOptional()
  @IsNumber()
  totalSize?: number;

  @ApiPropertyOptional({ description: 'Is empty directory' })
  @IsOptional()
  @IsBoolean()
  isEmpty?: boolean;
}

/**
 * Symlink metadata DTO
 */
export class SymlinkMetadataDto extends FileMetadataDto {
  @ApiProperty({ description: 'Target path' })
  @IsString()
  target: string;

  @ApiPropertyOptional({ description: 'Is broken link' })
  @IsOptional()
  @IsBoolean()
  broken?: boolean;
}

/**
 * Metadata request DTO
 */
export class FileMetadataRequestDto {
  @ApiProperty({ description: 'File path' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'Include hash calculation' })
  @IsOptional()
  @IsBoolean()
  includeHash?: boolean;

  @ApiPropertyOptional({ description: 'Follow symlinks' })
  @IsOptional()
  @IsBoolean()
  followSymlinks?: boolean;

  @ApiPropertyOptional({ description: 'Include extended attributes' })
  @IsOptional()
  @IsBoolean()
  includeExtendedAttributes?: boolean;
}

/**
 * Bulk metadata request DTO
 */
export class BulkFileMetadataRequestDto {
  @ApiProperty({ description: 'File paths' })
  @IsArray()
  @IsString({ each: true })
  paths: string[];

  @ApiProperty({ description: 'Metadata request options' })
  @ValidateNested()
  @Type(() => FileMetadataRequestDto)
  options: FileMetadataRequestDto;
}

/**
 * Metadata response DTO
 */
export class FileMetadataResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'File path' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'File metadata' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileMetadataDto)
  metadata?: FileMetadataDto;

  @ApiPropertyOptional({ description: 'Error message if operation failed' })
  @IsOptional()
  @IsString()
  error?: string;
}
