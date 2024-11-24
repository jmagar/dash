import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ConfigValue {
  @ApiProperty({ description: 'Configuration value' })
  value: any;

  @ApiProperty({ description: 'Configuration value type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Is the configuration value encrypted' })
  @IsBoolean()
  isEncrypted: boolean;

  @ApiProperty({ description: 'Last updated timestamp' })
  @IsString()
  updatedAt: string;

  constructor(partial: Partial<ConfigValue>) {
    // Set default values
    this.value = null;
    this.type = 'string';
    this.isEncrypted = false;
    this.updatedAt = new Date().toISOString();

    // Override defaults with provided values
    Object.assign(this, partial);
  }
}

export class BaseConfigDto {
  @ApiProperty({ description: 'Configuration key/name' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Configuration description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Configuration environment (e.g., development, production)' })
  @IsString()
  environment: string;

  @ApiProperty({ description: 'Configuration value', type: ConfigValue })
  @Type(() => ConfigValue)
  @ValidateNested()
  value: ConfigValue;

  @ApiProperty({ description: 'Is the configuration enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Configuration tags', required: false })
  @IsObject()
  @IsOptional()
  tags?: Record<string, string>;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  constructor(partial: Partial<BaseConfigDto>) {
    // Set default values
    this.key = '';
    this.description = '';
    this.environment = 'development';
    this.enabled = true;
    this.value = new ConfigValue({});

    // Override defaults with provided values
    Object.assign(this, partial);

    // Ensure value is properly instantiated as ConfigValue
    if (partial.value) {
      this.value = new ConfigValue(partial.value);
    }
  }
}
