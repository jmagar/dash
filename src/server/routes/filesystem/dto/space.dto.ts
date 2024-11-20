import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for space item references
 */
export class SpaceItemDto {
  @IsString()
  locationId: string;

  @IsString()
  path: string;
}

/**
 * DTO for creating a new space
 */
export class CreateSpaceDto {
  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpaceItemDto)
  items: SpaceItemDto[];
}

/**
 * DTO for updating an existing space
 */
export class UpdateSpaceDto extends CreateSpaceDto {}
