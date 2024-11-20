import { IsString, IsArray, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for file listing operations
 */
export class ListFilesDto {
  @IsString()
  path: string;

  @IsOptional()
  @IsBoolean()
  showHidden?: boolean;
}

/**
 * DTO for file upload operations
 */
export class UploadFilesDto {
  @IsString()
  path: string;

  // Files will be handled by multer
}

/**
 * DTO for copy/move operations
 */
export class CopyMoveDto {
  @IsString()
  sourcePath: string;

  @IsString()
  targetLocationId: string;

  @IsString()
  targetPath: string;

  @IsOptional()
  @IsBoolean()
  recursive?: boolean;
}

/**
 * DTO for creating directories
 */
export class CreateDirectoryDto {
  @IsString()
  path: string;

  @IsString()
  name: string;
}

/**
 * DTO for deleting files/directories
 */
export class DeleteFilesDto {
  @IsArray()
  @IsString({ each: true })
  paths: string[];
}

/**
 * DTO for file selection operations
 */
export class FileFilterDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extensions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mimeTypes?: string[];
}

export class SelectFilesDto {
  @IsString()
  type: 'file' | 'directory';

  @IsOptional()
  @IsBoolean()
  multiple?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => FileFilterDto)
  filter?: FileFilterDto;
}

/**
 * DTO for file search operations
 */
export class SearchFilesDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsBoolean()
  recursive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => FileFilterDto)
  filter?: FileFilterDto;
}
