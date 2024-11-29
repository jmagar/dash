import { IsString, IsArray } from 'class-validator';

export class CompressFilesDto {
  @IsString()
  hostId: string;

  @IsArray()
  @IsString({ each: true })
  sourcePaths: string[];

  @IsString()
  targetPath: string;
}

export class DecompressFileDto {
  @IsString()
  hostId: string;

  @IsString()
  sourcePath: string;

  @IsString()
  targetPath: string;
}
