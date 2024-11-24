import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PermissionType {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  EXECUTE = 'EXECUTE',
  ADMIN = 'ADMIN',
}

export enum ResourceType {
  FILE = 'FILE',
  DIRECTORY = 'DIRECTORY',
  DATABASE = 'DATABASE',
  API = 'API',
  SERVICE = 'SERVICE',
}

export class BasePermissionDto {
  @ApiProperty({ description: 'Permission type', enum: PermissionType })
  @IsEnum(PermissionType)
  type: PermissionType;

  @ApiProperty({ description: 'Resource type', enum: ResourceType })
  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @ApiProperty({ description: 'Resource identifier' })
  @IsString()
  resourceId: string;

  @ApiProperty({ description: 'Permission expiration date', required: false })
  @IsOptional()
  expiresAt?: Date;

  @ApiProperty({ description: 'Additional permission metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;

  constructor(partial: Partial<BasePermissionDto>) {
    Object.assign(this, partial);
  }
}
