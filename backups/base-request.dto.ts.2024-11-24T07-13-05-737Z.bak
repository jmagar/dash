import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsArray, IsObject, ValidateNested, Type } from 'class-validator';

export class UserContext {
  @ApiProperty({ description: 'User ID making the request' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'User roles for authorization' })
  @IsArray()
  @IsString({ each: true })
  roles: string[];

  @ApiProperty({ description: 'User permissions for fine-grained access control' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiProperty({ description: 'User preferences' })
  @IsObject()
  @IsOptional()
  preferences?: Record<string, unknown>;
}

export class TenantContext {
  @ApiProperty({ description: 'Tenant ID for multi-tenancy' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ description: 'Tenant type or category' })
  @IsString()
  @IsOptional()
  tenantType?: string;

  @ApiProperty({ description: 'Tenant-specific settings' })
  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class RequestSettings {
  @ApiProperty({ description: 'Request priority level', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsString()
  @IsOptional()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';

  @ApiProperty({ description: 'Request timeout in milliseconds' })
  @IsNumber()
  @IsOptional()
  timeoutMs?: number = 30000;

  @ApiProperty({ description: 'Whether to return detailed response' })
  @IsBoolean()
  @IsOptional()
  detailed?: boolean = false;

  @ApiProperty({ description: 'Response format preference', enum: ['JSON', 'XML', 'CSV'] })
  @IsString()
  @IsOptional()
  responseFormat?: 'JSON' | 'XML' | 'CSV' = 'JSON';
}

export class BaseRequestDto {
  @ApiProperty({ description: 'Unique request identifier for tracing' })
  @IsUUID()
  @IsOptional()
  requestId?: string;

  @ApiProperty({ description: 'Client timestamp of the request' })
  @IsString()
  @IsOptional()
  clientTimestamp?: string;

  @ApiProperty({ description: 'Client version information' })
  @IsString()
  @IsOptional()
  clientVersion?: string;

  @ApiProperty({ description: 'Request source/origin' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiProperty({ description: 'User context information' })
  @ValidateNested()
  @Type(() => UserContext)
  @IsOptional()
  userContext?: UserContext;

  @ApiProperty({ description: 'Tenant context information' })
  @ValidateNested()
  @Type(() => TenantContext)
  @IsOptional()
  tenantContext?: TenantContext;

  @ApiProperty({ description: 'Request settings' })
  @ValidateNested()
  @Type(() => RequestSettings)
  @IsOptional()
  settings?: RequestSettings;

  @ApiProperty({ description: 'Additional request metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  constructor(partial: Partial<BaseRequestDto>) {
    Object.assign(this, partial);
  }
}
