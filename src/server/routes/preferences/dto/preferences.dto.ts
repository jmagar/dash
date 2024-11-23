import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Theme mode options
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

/**
 * DTO for user preferences response
 */
export class UserPreferencesDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: ThemeMode, description: 'Theme mode preference' })
  @IsEnum(ThemeMode)
  themeMode: ThemeMode;

  @ApiProperty({ description: 'Accent color in hex format (e.g., #FF0000)' })
  @IsString()
  accentColor: string;

  @ApiProperty({ description: 'When the preferences were created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the preferences were last updated' })
  updatedAt: Date;
}

/**
 * DTO for updating user preferences
 */
export class UpdatePreferencesDto {
  @ApiPropertyOptional({ enum: ThemeMode, description: 'Theme mode preference' })
  @IsEnum(ThemeMode)
  @IsOptional()
  themeMode?: ThemeMode;

  @ApiPropertyOptional({ description: 'Accent color in hex format (e.g., #FF0000)' })
  @IsString()
  @IsOptional()
  accentColor?: string;
}
