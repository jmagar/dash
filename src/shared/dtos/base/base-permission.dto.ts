import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PermissionType, ResourceType } from '../enums';

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
  resourceId: string = '*';

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

  @ApiProperty({ description: 'Additional permission metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any> = {};

  constructor(partial?: Partial<BasePermissionDto>) {
    Object.assign(this, partial);
  }
}