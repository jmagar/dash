import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

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

  constructor(partial: Partial<AuditChange>) {
    this.field = '';
    Object.assign(this, partial);
  }
}

export class BaseAuditDto {
  @ApiProperty({ description: 'Type of action performed', enum: AuditAction })
  @IsEnum(AuditAction)
  action!: AuditAction;

  @ApiProperty({ description: 'User or service that performed the action' })
  @IsString()
  actor!: string;

  @ApiProperty({ description: 'Type of actor (user, service, system)' })
  @IsString()
  actorType!: string;

  @ApiProperty({ description: 'Resource that was acted upon' })
  @IsString()
  resource!: string;

  @ApiProperty({ description: 'Resource type (entity, file, service)' })
  @IsString()
  resourceType!: string;

  @ApiProperty({ description: 'Timestamp of the action' })
  @IsDate()
  @Type(() => Date)
  timestamp!: Date;

  @ApiProperty({ description: 'List of changes made', type: [AuditChange], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AuditChange)
  changes?: AuditChange[];

  @ApiProperty({ description: 'Additional audit metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  constructor(partial?: Partial<BaseAuditDto>) {
    // Set default values for optional fields only
    this.actorType = 'SYSTEM';
    this.timestamp = new Date();
    this.metadata = {};

    if (partial) {
      Object.assign(this, {
        ...partial,
        timestamp: partial.timestamp ? new Date(partial.timestamp) : this.timestamp,
        changes: partial.changes ? partial.changes.map(c => new AuditChange(c)) : undefined,
        metadata: partial.metadata || this.metadata
      });
    }
  }
}
