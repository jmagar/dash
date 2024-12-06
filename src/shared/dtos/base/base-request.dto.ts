import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsArray, IsObject, ValidateNested, IsNumber } from 'class-validator';
import { Type as ValidateType } from 'class-transformer';
import { IsStringRecord } from './validators/is-string-record.validator';

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

  constructor(partial: Partial<UserContext>) {
    this.userId = '';
    this.roles = [];
    Object.assign(this, partial);
  }
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

  constructor(partial: Partial<TenantContext>) {
    this.tenantId = '';
    Object.assign(this, partial);
  }
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

  constructor(partial: Partial<RequestSettings>) {
    Object.assign(this, partial);
  }
}

export class BaseRequestDto {
  @ApiProperty({ description: 'Request ID', required: false })
  @IsOptional()
  @IsUUID()
  requestId?: string;

  @ApiProperty({ description: 'User ID', required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Host ID', required: false })
  @IsOptional()
  @IsString()
  hostId?: string;

  @ApiProperty({ description: 'Request preferences', required: false })
  @IsOptional()
  @IsObject()
  @IsStringRecord()
  preferences?: Record<string, string>;

  @ApiProperty({ description: 'Request metadata', required: false })
  @IsOptional()
  @IsObject()
  @IsStringRecord()
  metadata?: Record<string, string>;

  @ApiProperty({ description: 'User context information' })
  @ValidateNested()
  @ValidateType(() => UserContext)
  @IsOptional()
  userContext?: UserContext;

  @ApiProperty({ description: 'Tenant context information' })
  @ValidateNested()
  @ValidateType(() => TenantContext)
  @IsOptional()
  tenantContext?: TenantContext;

  @ApiProperty({ description: 'Request settings', type: () => RequestSettings })
  @ValidateNested()
  @ValidateType(() => RequestSettings)
  @IsOptional()
  requestSettings?: RequestSettings;

  constructor(partial?: Partial<BaseRequestDto>) {
    if (partial) {
      const { requestSettings, ...rest } = partial;
      Object.assign(this, rest);
      if (this.userContext) {
        this.userContext = new UserContext(this.userContext);
      }
      if (this.tenantContext) {
        this.tenantContext = new TenantContext(this.tenantContext);
      }
      if (requestSettings) {
        this.requestSettings = new RequestSettings(requestSettings);
      }
    }
  }
}
