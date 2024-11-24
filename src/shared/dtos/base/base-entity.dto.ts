import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDate, IsOptional, IsObject, IsBoolean, IsString, IsArray, ValidateNested, Min, IsInt, IsNotEmpty, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { IsAuditDatesValid } from './validators/is-audit-dates-valid.validator';

export class AuditInfo {
  @ApiProperty({ description: 'When the entity was created' })
  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  @ApiProperty({ description: 'Who created the entity' })
  @IsUUID()
  createdBy: string;

  @ApiProperty({ description: 'When the entity was last updated' })
  @Type(() => Date)
  @IsDate()
  updatedAt: Date;

  @ApiProperty({ description: 'Who last updated the entity' })
  @IsUUID()
  updatedBy: string;

  @ApiProperty({ description: 'When the entity was deleted (if applicable)' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  deletedAt?: Date;

  @ApiProperty({ description: 'Who deleted the entity (if applicable)' })
  @IsUUID()
  @IsOptional()
  deletedBy?: string;

  @ApiProperty({ description: 'IP address of the user who created the entity' })
  @IsString()
  @IsOptional()
  createdFromIp?: string;

  @ApiProperty({ description: 'IP address of the user who last updated the entity' })
  @IsString()
  @IsOptional()
  updatedFromIp?: string;

  @ApiProperty({ description: 'IP address of the user who deleted the entity' })
  @IsString()
  @IsOptional()
  deletedFromIp?: string;

  @ApiProperty({ description: 'User agent of the client who created the entity' })
  @IsString()
  @IsOptional()
  createdUserAgent?: string;

  @ApiProperty({ description: 'User agent of the client who last updated the entity' })
  @IsString()
  @IsOptional()
  updatedUserAgent?: string;

  @ApiProperty({ description: 'User agent of the client who deleted the entity' })
  @IsString()
  @IsOptional()
  deletedUserAgent?: string;

  constructor(partial: Partial<AuditInfo>) {
    Object.assign(this, partial);
    // Convert string dates to Date objects
    if (partial.createdAt && !(partial.createdAt instanceof Date)) {
      this.createdAt = new Date(partial.createdAt);
    }
    if (partial.updatedAt && !(partial.updatedAt instanceof Date)) {
      this.updatedAt = new Date(partial.updatedAt);
    }
    if (partial.deletedAt && !(partial.deletedAt instanceof Date)) {
      this.deletedAt = new Date(partial.deletedAt);
    }
  }
}

export class BaseEntityDto {
  @ApiProperty({ description: 'Unique identifier for the entity' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Tenant identifier for multi-tenancy support' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ description: 'Audit information for the entity' })
  @ValidateNested()
  @Type(() => AuditInfo)
  @IsAuditDatesValid()
  audit: AuditInfo;

  @ApiProperty({ description: 'Version number for optimistic locking' })
  @IsInt()
  @Min(0)
  @IsOptional()
  version?: number;

  @ApiProperty({ description: 'Whether the entity is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiProperty({ description: 'Tags for categorizing and filtering entities' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ description: 'Additional metadata for the entity' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  constructor(partial: Partial<BaseEntityDto>) {
    Object.assign(this, partial);
    // Initialize audit info if provided
    if (partial.audit) {
      this.audit = new AuditInfo(partial.audit);
    }
    // Initialize default values
    if (this.isActive === undefined) {
      this.isActive = true;
    }
    if (!this.version) {
      this.version = 0;
    }
  }
}
