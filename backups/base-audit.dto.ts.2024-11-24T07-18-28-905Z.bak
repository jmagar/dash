import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXECUTE = 'EXECUTE',
}

export class AuditChange {
  @ApiProperty({ description: 'Field that was changed' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Previous value', required: false })
  @IsOptional()
  oldValue?: any;

  @ApiProperty({ description: 'New value', required: false })
  @IsOptional()
  newValue?: any;
}

export class BaseAuditDto {
  @ApiProperty({ description: 'Type of action performed', enum: AuditAction })
  @IsEnum(AuditAction)
  action: AuditAction;

  @ApiProperty({ description: 'User or service that performed the action' })
  @IsString()
  actor: string;

  @ApiProperty({ description: 'Type of actor (user, service, system)' })
  @IsString()
  actorType: string;

  @ApiProperty({ description: 'Resource that was acted upon' })
  @IsString()
  resource: string;

  @ApiProperty({ description: 'Resource type (entity, file, service)' })
  @IsString()
  resourceType: string;

  @ApiProperty({ description: 'When the action occurred' })
  @IsDate()
  timestamp: Date = new Date();

  @ApiProperty({ description: 'Duration of the action in milliseconds', required: false })
  @IsOptional()
  duration?: number;

  @ApiProperty({ description: 'Changes made during the action', type: [AuditChange], required: false })
  @IsOptional()
  changes?: AuditChange[];

  @ApiProperty({ description: 'Additional context or metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  constructor(partial: Partial<BaseAuditDto>) {
    Object.assign(this, partial);
  }
}
