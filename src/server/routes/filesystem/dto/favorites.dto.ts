import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for favorite item operations
 */
export class FavoriteItemDto {
  @ApiProperty({
    description: 'ID of the filesystem location',
    example: 'local-123',
  })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({
    description: 'Path to the file or directory',
    example: '/path/to/favorite',
  })
  @IsString()
  @IsNotEmpty()
  path: string;
}
