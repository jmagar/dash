import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Environment } from './enums';

export class ConfigValue<T = any> {
  @ApiProperty({ description: 'Configuration value' })
  @IsNotEmpty()
  value: T;

  @ApiProperty({ description: 'Configuration value type' })
  @IsString()
  @IsNotEmpty()
  type = '';

  @ApiProperty({ description: 'Is the configuration value encrypted' })
  @IsBoolean()
  isEncrypted = false;

  @ApiProperty({ description: 'Last updated timestamp' })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date = new Date();

  @ApiProperty({ description: 'Environment for this configuration' })
  @IsString()
  @IsNotEmpty()
  environment = '';

  constructor(partial?: Partial<ConfigValue<T>>) {
    const defaults = {
      value: undefined as T,
      type: 'string',
      isEncrypted: false,
      updatedAt: new Date(),
      environment: ''
    };

    Object.assign(this, defaults);

    if (partial) {
      Object.assign(this, partial);
      if (typeof partial.updatedAt === 'string') {
        this.updatedAt = new Date(partial.updatedAt);
      }
    }
  }
}

export class BaseConfigDto {
  @ApiProperty({ description: 'Unique identifier for the config' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ description: 'Description of what the config controls' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'Configuration environment (e.g., development, production)' })
  @IsEnum(Environment)
  @IsNotEmpty()
  environment!: Environment;

  @ApiProperty({ description: 'Configuration value object', type: ConfigValue })
  @ValidateNested()
  @Type(() => ConfigValue)
  @IsOptional()
  value?: ConfigValue<any>;

  @ApiProperty({ description: 'Is the configuration enabled' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({ description: 'Configuration tags' })
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  constructor(partial?: Partial<BaseConfigDto>) {
    if (partial) {
      const { value, enabled, tags, metadata, ...rest } = partial;
      Object.assign(this, {
        ...rest,
        value: value === null ? undefined : (value ? new ConfigValue(value) : undefined),
        enabled: enabled === null ? undefined : enabled,
        tags: tags === null ? undefined : tags,
        metadata: metadata === null ? undefined : metadata
      });
    }
  }
}
