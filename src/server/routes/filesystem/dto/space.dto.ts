import { IsString, IsArray, ValidateNested, IsNotEmpty, ArrayMinSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for space item references
 */
export class SpaceItemDto {
  @ApiProperty({ description: 'ID of the filesystem location' })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({ description: 'Path to the item in the filesystem' })
  @IsString()
  @IsNotEmpty()
  path: string;
}

/**
 * DTO for creating a new space
 */
export class CreateSpaceDto {
  @ApiProperty({ description: 'Name of the space' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [SpaceItemDto], description: 'List of items in the space' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SpaceItemDto)
  items: SpaceItemDto[];
}

/**
 * DTO for updating an existing space
 */
export class UpdateSpaceDto {
  @ApiPropertyOptional({ description: 'Name of the space' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ type: [SpaceItemDto], description: 'List of items in the space' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SpaceItemDto)
  items?: SpaceItemDto[];
}
