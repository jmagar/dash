import { IsString, IsEnum, IsOptional, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { FileSystemType } from '../../../../types/filesystem';

/**
 * DTO for filesystem credentials with protocol-specific options
 */
export class FileSystemCredentialsDto {
  @IsEnum(FileSystemType)
  type: FileSystemType;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsNumber()
  port?: number;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  // SFTP specific
  @IsOptional()
  @IsString()
  privateKey?: string;

  // SMB specific
  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  share?: string;

  // WebDAV specific
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsBoolean()
  digest?: boolean;

  // Rclone specific
  @IsOptional()
  @IsString()
  rcloneConfig?: string;

  @IsOptional()
  @IsString()
  remoteName?: string;
}

/**
 * DTO for creating a new filesystem location
 */
export class CreateLocationDto {
  @IsString()
  name: string;

  @IsEnum(FileSystemType)
  type: FileSystemType;

  @ValidateNested()
  @Type(() => FileSystemCredentialsDto)
  credentials: FileSystemCredentialsDto;
}

/**
 * DTO for updating an existing filesystem location
 */
export class UpdateLocationDto extends CreateLocationDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FileSystemCredentialsDto)
  credentials: FileSystemCredentialsDto;
}
