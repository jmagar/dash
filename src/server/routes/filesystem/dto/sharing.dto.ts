import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
    IsString, 
    IsNumber, 
    IsOptional, 
    IsObject, 
    IsBoolean, 
    IsArray, 
    ValidateNested, 
    IsEnum, 
    IsDate,
    IsUrl,
    Min,
    Max,
    IsInt
} from 'class-validator';

/**
 * Share access type enum
 */
export enum ShareAccessType {
    READ = 'read',
    WRITE = 'write',
    FULL = 'full'
}

/**
 * Share status enum
 */
export enum ShareStatus {
    ACTIVE = 'active',
    EXPIRED = 'expired',
    REVOKED = 'revoked'
}

/**
 * Share rate limit configuration DTO
 */
export class ShareRateLimitConfigDto {
    @ApiProperty({ description: 'Maximum number of requests per window' })
    @IsInt()
    @Min(1)
    @Max(1000)
    maxRequests: number;

    @ApiProperty({ description: 'Time window in minutes' })
    @IsInt()
    @Min(1)
    @Max(60)
    windowMinutes: number;
}

/**
 * Share security configuration DTO
 */
export class ShareSecurityConfigDto {
    @ApiPropertyOptional({ description: 'Rate limit configuration' })
    @IsOptional()
    @ValidateNested()
    @Type(() => ShareRateLimitConfigDto)
    rateLimit?: ShareRateLimitConfigDto;

    @ApiPropertyOptional({ description: 'Allowed IP addresses' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    allowedIps?: string[];

    @ApiPropertyOptional({ description: 'Allowed referrers' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    allowedReferrers?: string[];

    @ApiPropertyOptional({ description: 'Whether to enforce CSRF protection' })
    @IsOptional()
    @IsBoolean()
    csrfProtection?: boolean;
}

/**
 * Share creation request DTO
 */
export class CreateShareRequestDto {
    @ApiProperty({ description: 'Path to file or directory to share' })
    @IsString()
    path: string;

    @ApiProperty({ description: 'Type of access to grant', enum: ShareAccessType })
    @IsEnum(ShareAccessType)
    accessType: ShareAccessType;

    @ApiPropertyOptional({ description: 'Share expiration date' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    expiresAt?: Date;

    @ApiPropertyOptional({ description: 'Maximum number of downloads/accesses allowed' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(1000)
    maxAccesses?: number;

    @ApiPropertyOptional({ description: 'Password protection for the share' })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiPropertyOptional({ description: 'Whether to allow directory downloads as zip' })
    @IsOptional()
    @IsBoolean()
    allowZipDownload?: boolean;

    @ApiPropertyOptional({ description: 'Custom metadata for the share' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;

    @ApiPropertyOptional({ description: 'Security configuration' })
    @IsOptional()
    @ValidateNested()
    @Type(() => ShareSecurityConfigDto)
    security?: ShareSecurityConfigDto;
}

/**
 * Share information DTO
 */
export class ShareInfoDto {
    @ApiProperty({ description: 'Unique share identifier' })
    @IsString()
    id: string;

    @ApiProperty({ description: 'Path to shared file or directory' })
    @IsString()
    path: string;

    @ApiProperty({ description: 'Share access URL' })
    @IsUrl()
    url: string;

    @ApiProperty({ description: 'Type of access granted', enum: ShareAccessType })
    @IsEnum(ShareAccessType)
    accessType: ShareAccessType;

    @ApiProperty({ description: 'Current share status', enum: ShareStatus })
    @IsEnum(ShareStatus)
    status: ShareStatus;

    @ApiProperty({ description: 'Share creation date' })
    @Type(() => Date)
    @IsDate()
    createdAt: Date;

    @ApiPropertyOptional({ description: 'Share expiration date' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    expiresAt?: Date;

    @ApiProperty({ description: 'Number of times the share has been accessed' })
    @IsNumber()
    accessCount: number;

    @ApiPropertyOptional({ description: 'Maximum number of accesses allowed' })
    @IsOptional()
    @IsNumber()
    maxAccesses?: number;

    @ApiPropertyOptional({ description: 'Whether the share is password protected' })
    @IsOptional()
    @IsBoolean()
    isPasswordProtected?: boolean;

    @ApiPropertyOptional({ description: 'Whether zip download is allowed' })
    @IsOptional()
    @IsBoolean()
    allowZipDownload?: boolean;

    @ApiPropertyOptional({ description: 'Last access date' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    lastAccessedAt?: Date;

    @ApiPropertyOptional({ description: 'Custom metadata' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;

    @ApiPropertyOptional({ description: 'Security configuration' })
    @IsOptional()
    @ValidateNested()
    @Type(() => ShareSecurityConfigDto)
    security?: ShareSecurityConfigDto;

    @ApiPropertyOptional({ description: 'CSRF token if enabled' })
    @IsOptional()
    @IsString()
    csrfToken?: string;
}

/**
 * Share access request DTO
 */
export class ShareAccessRequestDto {
    @ApiProperty({ description: 'Share identifier' })
    @IsString()
    shareId: string;

    @ApiPropertyOptional({ description: 'Share access password' })
    @IsOptional()
    @IsString()
    password?: string;
}

/**
 * Share modification request DTO
 */
export class ModifyShareRequestDto {
    @ApiProperty({ description: 'Share identifier' })
    @IsString()
    shareId: string;

    @ApiPropertyOptional({ description: 'New access type', enum: ShareAccessType })
    @IsOptional()
    @IsEnum(ShareAccessType)
    accessType?: ShareAccessType;

    @ApiPropertyOptional({ description: 'New expiration date' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    expiresAt?: Date;

    @ApiPropertyOptional({ description: 'New maximum number of accesses' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(1000)
    maxAccesses?: number;

    @ApiPropertyOptional({ description: 'New password' })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiPropertyOptional({ description: 'New zip download permission' })
    @IsOptional()
    @IsBoolean()
    allowZipDownload?: boolean;

    @ApiPropertyOptional({ description: 'Updated metadata' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;

    @ApiPropertyOptional({ description: 'Updated security configuration' })
    @IsOptional()
    @ValidateNested()
    @Type(() => ShareSecurityConfigDto)
    security?: ShareSecurityConfigDto;
}

/**
 * Share revocation request DTO
 */
export class RevokeShareRequestDto {
    @ApiProperty({ description: 'Share identifier' })
    @IsString()
    shareId: string;

    @ApiPropertyOptional({ description: 'Revocation reason' })
    @IsOptional()
    @IsString()
    reason?: string;
}

/**
 * Share access log entry DTO
 */
export class ShareAccessLogEntryDto {
    @ApiProperty({ description: 'Share identifier' })
    @IsString()
    shareId: string;

    @ApiProperty({ description: 'Access timestamp' })
    @Type(() => Date)
    @IsDate()
    timestamp: Date;

    @ApiProperty({ description: 'IP address of accessor' })
    @IsString()
    ipAddress: string;

    @ApiProperty({ description: 'User agent of accessor' })
    @IsString()
    userAgent: string;

    @ApiPropertyOptional({ description: 'Access result status' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Error message if access failed' })
    @IsOptional()
    @IsString()
    error?: string;

    @ApiPropertyOptional({ description: 'Request headers' })
    @IsOptional()
    @IsObject()
    headers?: Record<string, string>;

    @ApiPropertyOptional({ description: 'Rate limit status' })
    @IsOptional()
    @IsObject()
    rateLimit?: {
        remaining: number;
        reset: Date;
    };
}

/**
 * Share list request DTO
 */
export class ListSharesRequestDto {
    @ApiPropertyOptional({ description: 'Filter by path' })
    @IsOptional()
    @IsString()
    path?: string;

    @ApiPropertyOptional({ description: 'Filter by status', enum: ShareStatus })
    @IsOptional()
    @IsEnum(ShareStatus)
    status?: ShareStatus;

    @ApiPropertyOptional({ description: 'Filter by access type', enum: ShareAccessType })
    @IsOptional()
    @IsEnum(ShareAccessType)
    accessType?: ShareAccessType;

    @ApiPropertyOptional({ description: 'Include expired shares' })
    @IsOptional()
    @IsBoolean()
    includeExpired?: boolean;

    @ApiPropertyOptional({ description: 'Include access logs' })
    @IsOptional()
    @IsBoolean()
    includeAccessLogs?: boolean;
}

/**
 * Share list response DTO
 */
export class ListSharesResponseDto {
    @ApiProperty({ description: 'List of shares', type: [ShareInfoDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ShareInfoDto)
    shares: ShareInfoDto[];

    @ApiPropertyOptional({ description: 'Total number of shares' })
    @IsOptional()
    @IsNumber()
    total?: number;

    @ApiPropertyOptional({ description: 'Access logs for shares', type: [ShareAccessLogEntryDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ShareAccessLogEntryDto)
    accessLogs?: ShareAccessLogEntryDto[];
}
