import { IsString, IsOptional } from 'class-validator';

export class FileParams {
  @IsString()
  hostId: string;

  @IsOptional()
  @IsString()
  path?: string;
}

export class FileListResponse {
  path: string;
  files: {
    name: string;
    path: string;
    type: string;
    size: number;
    modified: string;
  }[];
}
