import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsDate, IsString } from 'class-validator';

export class FileSystemStatsDto {
  @ApiProperty({ description: 'Size in bytes' })
  @IsNumber()
  size: number;

  @ApiProperty({ description: 'Last access time' })
  @IsDate()
  atime: Date;

  @ApiProperty({ description: 'Last modification time' })
  @IsDate()
  mtime: Date;

  @ApiProperty({ description: 'Creation time' })
  @IsDate()
  ctime: Date;

  @ApiProperty({ description: 'Birth time' })
  @IsDate()
  birthtime: Date;

  @ApiProperty({ description: 'File mode' })
  @IsString()
  mode: string;
}
