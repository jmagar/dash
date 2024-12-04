import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean, IsEnum } from 'class-validator';
import { BaseFileSystemEntityDto } from './base.dto';
import { FileType } from './metadata.dto';

/**
 * File system entry DTO
 * Extends the base file system entity with additional properties specific to file entries
 */
export class FileSystemEntryDto extends BaseFileSystemEntityDto {
  @ApiProperty({ description: 'Entry type', enum: FileType })
  @IsEnum(FileType)
  @IsOptional()
  type?: FileType;

  @ApiPropertyOptional({ description: 'Whether the entry is a directory' })
  @IsBoolean()
  isDirectory: boolean;

  @ApiPropertyOptional({ description: 'Whether the entry is a file' })
  @IsBoolean()
  isFile: boolean;

  @ApiPropertyOptional({ description: 'Whether the entry is a symbolic link' })
  @IsBoolean()
  isSymbolicLink: boolean;

  @ApiPropertyOptional({ description: 'Size in bytes' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ description: 'Last modified time' })
  @IsOptional()
  @IsString()
  modifiedTime?: string;

  @ApiPropertyOptional({ description: 'Creation time' })
  @IsOptional()
  @IsString()
  creationTime?: string;

  @ApiPropertyOptional({ description: 'Last access time' })
  @IsOptional()
  @IsString()
  accessTime?: string;

  @ApiPropertyOptional({ description: 'File mode (permissions)' })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({ description: 'Additional attributes' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
