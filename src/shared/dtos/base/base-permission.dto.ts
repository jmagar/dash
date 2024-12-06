import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export enum PermissionType {
  READ = 'READ',
  WRITE = 'WRITE',
  EXECUTE = 'EXECUTE',
  ADMIN = 'ADMIN',
}

export enum ResourceType {
  FILE = 'FILE',
  DIRECTORY = 'DIRECTORY',
  SYSTEM = 'SYSTEM',
  APPLICATION = 'APPLICATION',
  ANY = 'ANY',
}

export class BasePermissionDto {
  @ApiProperty({ description: 'Permission type', enum: PermissionType })
  @IsEnum(PermissionType)
  @IsNotEmpty()
  type: PermissionType = PermissionType.READ;

  @ApiProperty({ description: 'Resource type', enum: ResourceType })
  @IsEnum(ResourceType)
  @IsNotEmpty()
  resourceType: ResourceType = ResourceType.ANY;

  @ApiProperty({ description: 'Resource identifier' })
  @IsString()
  @IsNotEmpty()
  resourceId = '*';

  @ApiProperty({ description: 'Permission granted timestamp' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  grantedAt: Date = new Date();

  @ApiProperty({ description: 'Permission expiry timestamp' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expiresAt?: Date;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> = {};

  constructor(partial?: Partial<BasePermissionDto>) {
    // Set default values
    this.type = PermissionType.READ;
    this.resourceType = ResourceType.ANY;
    this.resourceId = '*';
    this.grantedAt = new Date();
    this.metadata = {};

    // Override with provided values
    if (partial) {
      Object.assign(this, {
        ...partial,
        grantedAt: partial.grantedAt ? new Date(partial.grantedAt) : this.grantedAt,
        expiresAt: partial.expiresAt ? new Date(partial.expiresAt) : undefined,
        metadata: partial.metadata || this.metadata
      });
    }
  }
}
