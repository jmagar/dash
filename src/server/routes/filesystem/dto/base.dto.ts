import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean, IsEnum, IsArray } from 'class-validator';
import { FileType } from './metadata.dto';

/**
 * File system type enum
 */
export enum FileSystemType {
  LOCAL = 'local',
  SFTP = 'sftp',
  S3 = 's3',
  SMB = 'smb'
}

/**
 * File system permission enum
 */
export enum FileSystemPermission {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute'
}

/**
 * Base file system entity DTO
 */
export class BaseFileSystemEntityDto {
  @ApiProperty({ description: 'Entity name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Entity path' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'Entity type', enum: FileType })
  @IsEnum(FileType)
  @IsOptional()
  type?: FileType;

  @ApiPropertyOptional({ description: 'Entity permissions', enum: FileSystemPermission, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(FileSystemPermission, { each: true })
  permissions?: FileSystemPermission[];

  @ApiPropertyOptional({ description: 'Entity metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * File system credentials DTO
 */
export class FileSystemCredentialsDto {
  @ApiProperty({ description: 'Host address' })
  @IsString()
  host: string;

  @ApiPropertyOptional({ description: 'Port number' })
  @IsOptional()
  @IsString()
  port?: string;

  @ApiProperty({ description: 'Username' })
  @IsString()
  username: string;

  @ApiPropertyOptional({ description: 'Password' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Private key' })
  @IsOptional()
  @IsString()
  privateKey?: string;

  @ApiPropertyOptional({ description: 'Private key passphrase' })
  @IsOptional()
  @IsString()
  passphrase?: string;

  @ApiPropertyOptional({ description: 'Additional options' })
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

/**
 * File system connection status DTO
 */
export class FileSystemConnectionStatusDto {
  @ApiProperty({ description: 'Connection status' })
  @IsBoolean()
  connected: boolean;

  @ApiPropertyOptional({ description: 'Last error message' })
  @IsOptional()
  @IsString()
  lastError?: string;

  @ApiPropertyOptional({ description: 'Last connection time' })
  @IsOptional()
  @IsString()
  lastConnected?: string;

  @ApiPropertyOptional({ description: 'Connection metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
