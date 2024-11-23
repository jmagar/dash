import { IsString, IsEnum, IsOptional, ValidateNested, IsNumber, IsBoolean, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { FileSystemType } from '../../../../types/filesystem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for filesystem credentials with protocol-specific options
 */
export class FileSystemCredentialsDto {
  @ApiProperty({ enum: FileSystemType, description: 'Type of filesystem' })
  @IsEnum(FileSystemType)
  @IsNotEmpty()
  type: FileSystemType;

  @ApiPropertyOptional({ description: 'Host address for remote filesystems' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  host?: string;

  @ApiPropertyOptional({ description: 'Port number for the connection' })
  @IsOptional()
  @IsNumber()
  port?: number;

  @ApiPropertyOptional({ description: 'Username for authentication' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username?: string;

  @ApiPropertyOptional({ description: 'Password for authentication' })
  @IsOptional()
  @IsString()
  password?: string;

  // SFTP specific
  @ApiPropertyOptional({ description: 'SSH private key for SFTP authentication' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  privateKey?: string;

  // SMB specific
  @ApiPropertyOptional({ description: 'Domain for SMB authentication' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ description: 'SMB share name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  share?: string;

  // WebDAV specific
  @ApiPropertyOptional({ description: 'Base URL for WebDAV server' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'Use digest authentication for WebDAV' })
  @IsOptional()
  @IsBoolean()
  digest?: boolean;

  // Rclone specific
  @ApiPropertyOptional({ description: 'Rclone configuration string' })
  @IsOptional()
  @IsString()
  rcloneConfig?: string;

  @ApiPropertyOptional({ description: 'Rclone remote name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  remoteName?: string;
}

/**
 * DTO for creating a new filesystem location
 */
export class CreateLocationDto {
  @ApiProperty({ description: 'Name of the filesystem location' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: FileSystemType, description: 'Type of filesystem' })
  @IsEnum(FileSystemType)
  @IsNotEmpty()
  type: FileSystemType;

  @ApiProperty({ type: () => FileSystemCredentialsDto })
  @ValidateNested()
  @Type(() => FileSystemCredentialsDto)
  credentials: FileSystemCredentialsDto;
}

/**
 * DTO for updating an existing filesystem location
 */
export class UpdateLocationDto {
  @ApiPropertyOptional({ description: 'Name of the filesystem location' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ enum: FileSystemType, description: 'Type of filesystem' })
  @IsOptional()
  @IsEnum(FileSystemType)
  type?: FileSystemType;

  @ApiPropertyOptional({ type: () => FileSystemCredentialsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileSystemCredentialsDto)
  credentials?: FileSystemCredentialsDto;
}
