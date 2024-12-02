import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsObject, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum ShareAccessType {
    PUBLIC = 'public',
    PASSWORD = 'password',
    TOKEN = 'token',
}

export enum ShareSortBy {
    CREATED_AT = 'createdAt',
    LAST_ACCESSED = 'lastAccessed',
    ACCESS_COUNT = 'accessCount',
}

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

export enum ShareStatus {
    ACTIVE = 'active',
    EXPIRED = 'expired',
    REVOKED = 'revoked',
}

export class ShareSecurityDto {
    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    csrfProtection?: boolean = false;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    password?: string;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    expiresIn?: number;
}

export interface ShareAccessLogEntryDto {
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
    status: string;
    error?: string;
    headers?: Record<string, string>;
    rateLimit?: {
        remaining: number;
        reset: Date;
    };
}

export class CreateShareRequestDto {
    @ApiProperty()
    @IsString()
    path!: string;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    allowZipDownload?: boolean = false;

    @ApiPropertyOptional()
    @Type(() => ShareSecurityDto)
    @IsOptional()
    security?: ShareSecurityDto;

    @ApiPropertyOptional()
    @IsObject()
    @IsOptional()
    metadata?: Record<string, unknown>;

    @ApiProperty({ enum: ShareAccessType })
    @IsEnum(ShareAccessType)
    accessType!: ShareAccessType;
}

export class ShareInfoDto {
    @ApiProperty()
    @IsString()
    id!: string;

    @ApiProperty()
    @IsString()
    path!: string;

    @ApiProperty({ enum: ShareAccessType })
    @IsEnum(ShareAccessType)
    accessType!: ShareAccessType;

    @ApiProperty({ enum: ShareStatus })
    @IsEnum(ShareStatus)
    status!: ShareStatus;

    @ApiProperty()
    @IsString()
    url!: string;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    allowZipDownload?: boolean = false;

    @ApiPropertyOptional()
    @Type(() => ShareSecurityDto)
    @IsOptional()
    security?: ShareSecurityDto;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    csrfToken?: string;

    @ApiProperty()
    @IsDateString()
    createdAt!: Date;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    expiresAt?: Date;

    @ApiProperty()
    @IsString()
    createdBy!: string;

    @ApiProperty()
    @IsNumber()
    accessCount!: number;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    lastAccessedAt?: Date;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    hasPassword?: boolean = false;

    @ApiPropertyOptional()
    @IsObject()
    @IsOptional()
    metadata?: Record<string, unknown>;
}

export class ShareAccessRequestDto {
    @ApiProperty()
    @IsString()
    shareId!: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    password?: string;
}

export class ModifyShareRequestDto {
    @ApiProperty()
    @IsString()
    shareId!: string;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    allowZipDownload?: boolean = false;

    @ApiPropertyOptional()
    @Type(() => ShareSecurityDto)
    @IsOptional()
    security?: ShareSecurityDto;

    @ApiPropertyOptional()
    @IsObject()
    @IsOptional()
    metadata?: Record<string, unknown>;
}

export class RevokeShareRequestDto {
    @ApiProperty()
    @IsString()
    shareId!: string;
}

export class ListSharesRequestDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    path?: string;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    includeExpired?: boolean = false;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    limit?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    offset?: number;

    @ApiPropertyOptional({ enum: ShareSortBy })
    @IsEnum(ShareSortBy)
    @IsOptional()
    sortBy?: ShareSortBy;

    @ApiPropertyOptional({ enum: SortOrder })
    @IsEnum(SortOrder)
    @IsOptional()
    sortOrder?: SortOrder;
}

export class ListSharesResponseDto {
    @ApiProperty({ type: [ShareInfoDto] })
    @Type(() => ShareInfoDto)
    items!: ShareInfoDto[];

    @ApiProperty()
    @IsNumber()
    total!: number;

    @ApiProperty()
    @IsNumber()
    limit!: number;

    @ApiProperty()
    @IsNumber()
    offset!: number;
}
