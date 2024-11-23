import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsObject, IsBoolean, IsArray, ValidateNested, IsEnum } from 'class-validator';

/**
 * Permission type enum
 */
export enum FilePermissionType {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  FULL = 'full',
  NONE = 'none'
}

/**
 * Permission scope enum
 */
export enum FilePermissionScope {
  USER = 'user',
  GROUP = 'group',
  OTHER = 'other',
  ALL = 'all'
}

/**
 * File permission entry DTO
 */
export class FilePermissionEntryDto {
  @ApiProperty({ description: 'Permission type', enum: FilePermissionType })
  @IsEnum(FilePermissionType)
  type: FilePermissionType;

  @ApiProperty({ description: 'Permission scope', enum: FilePermissionScope })
  @IsEnum(FilePermissionScope)
  scope: FilePermissionScope;

  @ApiPropertyOptional({ description: 'Permission target (user or group name)' })
  @IsOptional()
  @IsString()
  target?: string;

  @ApiPropertyOptional({ description: 'Permission metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * File permissions DTO
 */
export class FilePermissionsDto {
  @ApiProperty({ description: 'File path' })
  @IsString()
  path: string;

  @ApiProperty({ description: 'Owner name' })
  @IsString()
  owner: string;

  @ApiProperty({ description: 'Group name' })
  @IsString()
  group: string;

  @ApiProperty({ description: 'Numeric mode (Unix-style)' })
  @IsNumber()
  mode: number;

  @ApiProperty({ description: 'Permission entries', type: [FilePermissionEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilePermissionEntryDto)
  permissions: FilePermissionEntryDto[];

  @ApiPropertyOptional({ description: 'ACL entries' })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  acl?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Permissions metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Permission modification request DTO
 */
export class FilePermissionModificationRequestDto {
  @ApiProperty({ description: 'File path' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'New owner name' })
  @IsOptional()
  @IsString()
  owner?: string;

  @ApiPropertyOptional({ description: 'New group name' })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional({ description: 'New numeric mode' })
  @IsOptional()
  @IsNumber()
  mode?: number;

  @ApiPropertyOptional({ description: 'Permission entries to modify' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilePermissionEntryDto)
  permissions?: FilePermissionEntryDto[];

  @ApiPropertyOptional({ description: 'ACL entries to modify' })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  acl?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Apply recursively to subdirectories' })
  @IsOptional()
  @IsBoolean()
  recursive?: boolean;

  @ApiPropertyOptional({ description: 'Preserve existing permissions' })
  @IsOptional()
  @IsBoolean()
  preserve?: boolean;
}

/**
 * Bulk permission modification request DTO
 */
export class BulkFilePermissionModificationRequestDto {
  @ApiProperty({ description: 'File paths' })
  @IsArray()
  @IsString({ each: true })
  paths: string[];

  @ApiProperty({ description: 'Permission modification request' })
  @ValidateNested()
  @Type(() => FilePermissionModificationRequestDto)
  modification: FilePermissionModificationRequestDto;
}

/**
 * Permission modification result DTO
 */
export class FilePermissionModificationResultDto {
  @ApiProperty({ description: 'Operation success status' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Modified file path' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'Error message if operation failed' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ description: 'New permissions after modification' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FilePermissionsDto)
  newPermissions?: FilePermissionsDto;

  @ApiPropertyOptional({ description: 'Operation metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
