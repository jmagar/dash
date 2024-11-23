import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for file path operations
 */
export class FilePathDto {
  @ApiProperty({
    description: 'Path to the file or directory',
    example: '/path/to/file.txt',
  })
  @IsString()
  @IsNotEmpty()
  path: string;
}
