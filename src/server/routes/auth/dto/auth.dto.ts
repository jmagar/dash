import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, Matches, IsBoolean, IsEnum, IsDate, IsOptional, IsUUID, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiResult } from '../../../../types/error';
import { LogMetadata } from '../../../../types/logger';

/**
 * User role enum
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

/**
 * Auth metadata interface
 */
export interface AuthMetadata {
  userId?: string;
  username?: string;
  role?: UserRole;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  lastLogin?: string;
  loginAttempts?: number;
  validationAttempts?: number;
}

/**
 * Base validation response
 */
export interface ValidationResponse {
  valid: boolean;
  errors?: string[];
  metadata?: AuthMetadata;
}

/**
 * DTO for user registration
 */
export class RegisterDto {
  @ApiProperty({ description: 'Username for registration' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_-]*$/, { message: 'Username can only contain letters, numbers, underscores and hyphens' })
  username: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Password for the account' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({ description: 'Confirm password' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  @ApiPropertyOptional({ description: 'Registration metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for login request
 */
export class LoginDto {
  @ApiProperty({ description: 'Username or email' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ description: 'Remember me option' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiPropertyOptional({ description: 'Device ID for multi-device support' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Login metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for refresh token request
 */
export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiPropertyOptional({ description: 'Device ID for multi-device support' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Refresh metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for user data
 */
export class UserDto {
  @ApiProperty({ description: 'Unique identifier' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User role', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ description: 'Account status' })
  @IsBoolean()
  is_active: boolean;

  @ApiProperty({ description: 'Account creation date' })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Account last update date' })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'User preferences' })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'User metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for authenticated user response
 */
export class AuthenticatedUserDto extends UserDto {
  @ApiProperty({ description: 'JWT access token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'JWT refresh token' })
  @IsString()
  refreshToken: string;

  @ApiPropertyOptional({ description: 'Token expiration' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  tokenExpiration?: Date;

  @ApiPropertyOptional({ description: 'Refresh token expiration' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  refreshTokenExpiration?: Date;
}

/**
 * Type for auth response with user data
 */
export type AuthResponse<T> = ApiResult<T> & {
  metadata?: LogMetadata & AuthMetadata;
};

/**
 * DTO for login response
 */
export class LoginResponseDto extends AuthResponse<AuthenticatedUserDto> {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'User data' })
  data: AuthenticatedUserDto;

  @ApiPropertyOptional({ description: 'Error message if login failed' })
  error?: string;

  @ApiPropertyOptional({ description: 'Validation response' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidationResponse)
  validation?: ValidationResponse;
}

/**
 * DTO for logout response
 */
export class LogoutResponseDto extends AuthResponse<null> {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Error message if logout failed' })
  error?: string;

  @ApiPropertyOptional({ description: 'Logout metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for token validation response
 */
export class ValidateResponseDto extends AuthResponse<AuthenticatedUserDto> {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Token validity' })
  valid: boolean;

  @ApiProperty({ description: 'User data' })
  data: AuthenticatedUserDto;

  @ApiPropertyOptional({ description: 'Error message if validation failed' })
  error?: string;

  @ApiPropertyOptional({ description: 'Validation response' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidationResponse)
  validation?: ValidationResponse;
}

/**
 * DTO for refresh token response
 */
export class RefreshTokenResponseDto extends AuthResponse<AuthenticatedUserDto> {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'New JWT access token' })
  data: AuthenticatedUserDto;

  @ApiPropertyOptional({ description: 'Error message if refresh failed' })
  error?: string;

  @ApiPropertyOptional({ description: 'Validation response' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidationResponse)
  validation?: ValidationResponse;
}

/**
 * DTO for session data
 */
export class SessionDto {
  @ApiProperty({ description: 'Session ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'User role', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ description: 'Account status' })
  @IsBoolean()
  is_active: boolean;

  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refreshToken: string;

  @ApiProperty({ description: 'Session creation date' })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Session last activity date' })
  @IsDate()
  @Type(() => Date)
  lastActivity: Date;

  @ApiPropertyOptional({ description: 'Session expiration date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Device information' })
  @IsOptional()
  @IsObject()
  device?: {
    id: string;
    type: string;
    name: string;
    platform: string;
    browser: string;
  };

  @ApiPropertyOptional({ description: 'Session metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for token payload
 */
export class TokenPayloadDto {
  @ApiProperty({ description: 'Token ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'User role', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ description: 'Account status' })
  @IsBoolean()
  is_active: boolean;

  @ApiProperty({ description: 'Token type', enum: ['access', 'refresh'] })
  @IsEnum(['access', 'refresh'])
  type: 'access' | 'refresh';

  @ApiPropertyOptional({ description: 'Token metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for access token payload
 */
export class AccessTokenPayloadDto extends TokenPayloadDto {
  @ApiProperty({ description: 'Token type', enum: ['access'] })
  @IsEnum(['access'])
  type: 'access';

  @ApiPropertyOptional({ description: 'Access token permissions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

/**
 * DTO for refresh token payload
 */
export class RefreshTokenPayloadDto extends TokenPayloadDto {
  @ApiProperty({ description: 'Token type', enum: ['refresh'] })
  @IsEnum(['refresh'])
  type: 'refresh';

  @ApiPropertyOptional({ description: 'Original access token ID' })
  @IsOptional()
  @IsUUID()
  accessTokenId?: string;
}

/**
 * DTO for update user request
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'New email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'New password' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password?: string;

  @ApiPropertyOptional({ description: 'Current password for verification' })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiPropertyOptional({ description: 'User preferences' })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Update metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for update user response
 */
export class UpdateUserResponseDto extends AuthResponse<UserDto> {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Updated user data' })
  data: UserDto;

  @ApiPropertyOptional({ description: 'Error message if update failed' })
  error?: string;

  @ApiPropertyOptional({ description: 'Validation response' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidationResponse)
  validation?: ValidationResponse;
}
